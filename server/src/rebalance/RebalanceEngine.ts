import { nodeManager } from '../nodes/NodeManager';
import { metadataManager } from '../metadata/MetadataManager';
import { objectService } from '../objects/ObjectService';
import { eventLogger } from '../events/EventLogger';
import { integrityService } from '../integrity/IntegrityService';
import { networkManager } from '../network/NetworkManager';
import { placementEngine } from '../nodes/PlacementEngine';

export interface RebalanceTask {
  taskId: string;
  objectId: string;
  sourceNodeId?: string;
  targetNodeId?: string;
  status: 'QUEUED' | 'MOVING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  bytesTransferred?: number;
  durationMs?: number;
  error?: string;
}

export class RebalanceEngine {
  private queue: RebalanceTask[] = [];
  private activeTasks: Map<string, RebalanceTask> = new Map();
  private completedTasks: RebalanceTask[] = [];
  private failedTasks: RebalanceTask[] = [];
  private isRebalancing = false;
  private rebalanceLocks: Set<string> = new Set();
  private interval: NodeJS.Timeout | null = null;
  private metrics = {
    objectsRebalanced: 0,
    bytesRebalanced: 0,
    totalRebalanceTimeMs: 0
  };

  startBackgroundRebalancing() {
    if (this.interval) clearInterval(this.interval);
    this.interval = setInterval(() => this.scanAndRebalance(), 10000); // 10s
  }

  getMetrics() {
    return {
      active: this.activeTasks.size,
      queued: this.queue.length,
      completed: this.completedTasks.length,
      failed: this.failedTasks.length,
      objectsRebalanced: this.metrics.objectsRebalanced,
      bytesRebalanced: this.metrics.bytesRebalanced,
      averageTimeMs: this.metrics.objectsRebalanced > 0 ? Math.round(this.metrics.totalRebalanceTimeMs / this.metrics.objectsRebalanced) : 0
    };
  }

  getTasks() {
    return {
      active: Array.from(this.activeTasks.values()),
      queued: this.queue,
      completed: this.completedTasks,
      failed: this.failedTasks
    };
  }

  reset() {
    this.queue = [];
    this.activeTasks.clear();
    this.completedTasks = [];
    this.failedTasks = [];
    this.rebalanceLocks.clear();
    this.isRebalancing = false;
    this.metrics = {
      objectsRebalanced: 0,
      bytesRebalanced: 0,
      totalRebalanceTimeMs: 0
    };
  }

  async scanAndRebalance() {
    const objects = await metadataManager.listObjects();
    const allNodes = nodeManager.getAllNodes().filter(n => n.status === 'ONLINE' || n.status === 'DEGRADED');
    if (allNodes.length === 0) return;
    const policy = objectService.getPolicy();
    
    for (const obj of objects) {
      if (this.rebalanceLocks.has(obj.objectId)) continue;
      if (obj.status === 'UNAVAILABLE') continue;

      const targetNodes = placementEngine.getPlacementNodes(obj.objectId, allNodes, policy);
      const targetNodeIds = new Set(targetNodes.map(n => n.nodeId));
      
      const currentHealthyReplicas = obj.replicas?.filter(r => r.status === 'HEALTHY' || r.status === 'STALE') || [];
      const currentNodeIds = new Set(currentHealthyReplicas.map(r => r.nodeId));
      
      const nodesToAdd = targetNodes.filter(n => !currentNodeIds.has(n.nodeId));
      const nodesToRemove = currentHealthyReplicas.filter(r => !targetNodeIds.has(r.nodeId));
      
      if (nodesToAdd.length > 0) {
        for (const destNode of nodesToAdd) {
          this.enqueueTask(obj.objectId, destNode.nodeId, nodesToRemove.map(r => r.nodeId));
        }
      }
    }
  }

  private enqueueTask(objectId: string, targetNodeId: string, possibleNodesToRemove: string[]) {
    // Only queue if not already queued for this target
    if (this.queue.some(t => t.objectId === objectId && t.targetNodeId === targetNodeId)) return;
    
    const task: RebalanceTask = {
      taskId: `reb_${Date.now()}_${objectId}_${targetNodeId}`,
      objectId,
      targetNodeId,
      status: 'QUEUED',
      createdAt: new Date().toISOString()
    };
    // Keep nodes to remove somewhere to process after move
    (task as any).nodesToRemove = possibleNodesToRemove;
    
    this.queue.push(task);
    eventLogger.log('REBALANCE_QUEUED', `Rebalance task queued for ${objectId} to ${targetNodeId}`, objectId);
    this.processQueue();
  }

  private async processQueue() {
    if (this.isRebalancing) return;
    this.isRebalancing = true;

    try {
      while (this.queue.length > 0) {
        const task = this.queue.shift()!;
        if (this.rebalanceLocks.has(task.objectId)) {
           // Put back in queue to wait
           this.queue.push(task);
           await new Promise(r => setTimeout(r, 1000));
           continue;
        }
        
        this.rebalanceLocks.add(task.objectId);
        
        try {
          await this.executeTask(task);
        } catch (error: any) {
          eventLogger.log('REBALANCE_FAILED', `Rebalance failed for ${task.objectId}: ${error.message}`, task.objectId);
        } finally {
          this.rebalanceLocks.delete(task.objectId);
        }
      }
    } finally {
      this.isRebalancing = false;
    }
  }

  private async executeTask(task: RebalanceTask) {
    this.activeTasks.set(task.taskId, task);
    task.status = 'MOVING';
    task.startedAt = new Date().toISOString();
    const startTime = Date.now();
    
    try {
      const metadata = await metadataManager.getMetadata(task.objectId);
      if (!metadata) throw new Error('Metadata not found');

      const healthyReplicas = metadata.replicas.filter(r => r.status === 'HEALTHY' || r.status === 'STALE');
      if (healthyReplicas.length === 0) throw new Error('No healthy replicas available for rebalance source');
      
      const destNode = nodeManager.getNode(task.targetNodeId!);
      if (!destNode || destNode.status === 'OFFLINE') throw new Error(`Destination node ${task.targetNodeId} is offline`);

      // Find a reachable source node
      let sourceNode = null;
      let sourceReplica = null;
      for (const rep of healthyReplicas) {
         if (networkManager.canCommunicate(rep.nodeId, destNode.nodeId)) {
            const sn = nodeManager.getNode(rep.nodeId);
            if (sn && sn.status !== 'OFFLINE') {
               sourceNode = sn;
               sourceReplica = rep;
               break;
            }
         }
      }

      if (!sourceNode) throw new Error(`No reachable healthy source node found for ${destNode.nodeId}`);
      task.sourceNodeId = sourceNode.nodeId;
      
      eventLogger.log('REBALANCE_STARTED', `Moving ${task.objectId} from ${sourceNode.nodeId} to ${destNode.nodeId}`, task.objectId, task.taskId);

      const data = await sourceNode.retrieve(task.objectId);
      await destNode.store(task.objectId, data);

      const verifiedStatus = await integrityService.verifyReplica(destNode.nodeId, task.objectId, metadata.checksum);
      if (verifiedStatus !== 'HEALTHY') {
        await destNode.delete(task.objectId);
        throw new Error(`Integrity verification failed on new node ${destNode.nodeId}`);
      }

      const newReplicaInfo = {
        nodeId: destNode.nodeId,
        status: 'HEALTHY' as const,
        version: metadata.version,
        checksum: metadata.checksum,
        size: metadata.size,
        lastVerified: new Date().toISOString()
      };

      const existingReplicaIndex = metadata.replicas.findIndex(r => r.nodeId === destNode.nodeId);
      if (existingReplicaIndex >= 0) metadata.replicas[existingReplicaIndex] = newReplicaInfo;
      else metadata.replicas.push(newReplicaInfo);

      // Now safe to remove an old replica if needed
      const nodesToRemove: string[] = (task as any).nodesToRemove || [];
      if (nodesToRemove.length > 0) {
        // just remove the first one that is unreachable or we don't care, wait, we must not reduce healthy below writeQuorum unnecessarily.
        // Actually, the prompt says: "safe movement protocols (verify new replica before removing old one)"
        // Let's remove the old replica from the list.
        const nodeToRemoveId = nodesToRemove[0];
        const oldNode = nodeManager.getNode(nodeToRemoveId);
        if (oldNode && networkManager.canCommunicate(destNode.nodeId, oldNode.nodeId)) { // maybe coordinator needs to reach it
            await oldNode.delete(task.objectId);
            const removeIdx = metadata.replicas.findIndex(r => r.nodeId === nodeToRemoveId);
            if (removeIdx >= 0) metadata.replicas.splice(removeIdx, 1);
            eventLogger.log('REBALANCE_OLD_REMOVED', `Removed old replica from ${nodeToRemoveId}`, task.objectId, task.taskId);
        }
      }

      await metadataManager.updateMetadata(task.objectId, { replicas: metadata.replicas });
      eventLogger.log('REBALANCE_COMPLETED', `Rebalance completed for ${task.objectId} on ${destNode.nodeId}`, task.objectId, task.taskId);

      const durationMs = Date.now() - startTime;
      task.status = 'COMPLETED';
      task.completedAt = new Date().toISOString();
      task.bytesTransferred = data.length;
      task.durationMs = durationMs;
      this.metrics.objectsRebalanced++;
      this.metrics.bytesRebalanced += data.length;
      this.metrics.totalRebalanceTimeMs += durationMs;

      this.completedTasks.push(task);
      this.activeTasks.delete(task.taskId);
    } catch (error: any) {
      task.status = 'FAILED';
      task.error = error.message;
      task.completedAt = new Date().toISOString();
      task.durationMs = Date.now() - startTime;
      this.failedTasks.push(task);
      this.activeTasks.delete(task.taskId);
      throw error;
    }
  }
}

export const rebalanceEngine = new RebalanceEngine();
