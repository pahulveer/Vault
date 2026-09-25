import { nodeManager } from '../nodes/NodeManager';
import { metadataManager } from '../metadata/MetadataManager';
import { objectService } from '../objects/ObjectService';
import { eventLogger } from '../events/EventLogger';
import { integrityService } from '../integrity/IntegrityService';
import { networkManager } from '../network/NetworkManager';

export interface RepairTask {
  repairId: string;
  objectId: string;
  failedNodeId?: string;
  sourceNodeId?: string;
  destinationNodeId?: string;
  status: 'QUEUED' | 'REPAIRING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  bytesTransferred: number;
}

export class RepairService {
  private queue: { objectId: string, priority: number }[] = [];
  private activeRepairs: Map<string, RepairTask> = new Map();
  private completedRepairs: RepairTask[] = [];
  private failedRepairs: RepairTask[] = [];
  private isRepairing = false;
  private repairLocks: Set<string> = new Set();
  
  private metrics = {
    objectsRecovered: 0,
    bytesRepaired: 0,
    totalRepairTimeMs: 0
  };

  getMetrics() {
    return {
      activeRepairs: this.activeRepairs.size,
      queuedRepairs: this.queue.length,
      completedRepairs: this.completedRepairs.length,
      failedRepairs: this.failedRepairs.length,
      averageRepairTimeMs: this.metrics.objectsRecovered > 0 ? this.metrics.totalRepairTimeMs / this.metrics.objectsRecovered : 0,
      objectsRecovered: this.metrics.objectsRecovered,
      bytesRepaired: this.metrics.bytesRepaired
    };
  }

  getRepairs() {
    return {
      active: Array.from(this.activeRepairs.values()),
      queued: this.queue,
      completed: this.completedRepairs,
      failed: this.failedRepairs
    };
  }

  reset() {
    this.queue = [];
    this.activeRepairs.clear();
    this.completedRepairs = [];
    this.failedRepairs = [];
    this.repairLocks.clear();
    this.isRepairing = false;
    this.metrics = {
      objectsRecovered: 0,
      bytesRepaired: 0,
      totalRepairTimeMs: 0
    };
  }
  
  async enqueueRepair(objectId: string, priority: number = 0) {
    if (!this.queue.some(q => q.objectId === objectId) && !this.repairLocks.has(objectId)) {
      this.queue.push({ objectId, priority });
      this.queue.sort((a, b) => b.priority - a.priority);
      eventLogger.log('REPAIR_QUEUED', `Object ${objectId} queued for repair`, objectId);
      this.processQueue(); // async trigger
    }
  }

  // Scan all objects and queue degraded ones
  async scanAndQueue() {
    const objects = await metadataManager.listObjects();
    const policy = objectService.getPolicy();
    for (const obj of objects) {
      if (obj.status === 'DEGRADED' || obj.status === 'UNAVAILABLE') {
        const healthyCount = obj.replicas?.filter(r => r.status === 'HEALTHY').length || 0;
        let priority = 0; // NORMAL
        if (healthyCount < policy.writeQuorum) priority = 2; // CRITICAL
        else if (healthyCount === policy.writeQuorum) priority = 1; // HIGH
        
        await this.enqueueRepair(obj.objectId, priority);
      }
    }
  }

  private async processQueue() {
    if (this.isRepairing) return;
    this.isRepairing = true;

    try {
      while (this.queue.length > 0) {
        const { objectId } = this.queue.shift()!;
        if (this.repairLocks.has(objectId)) continue;
        
        this.repairLocks.add(objectId);
        
        try {
          await this.repairObject(objectId);
        } catch (error: any) {
          eventLogger.log('REPAIR_FAILED', `Repair failed for ${objectId}: ${error.message}`, objectId);
        } finally {
          this.repairLocks.delete(objectId);
        }
      }
    } finally {
      this.isRepairing = false;
    }
  }

  private async repairObject(objectId: string) {
    const repairTask: RepairTask = {
      repairId: `rep_${Date.now()}_${objectId}`,
      objectId,
      status: 'QUEUED',
      createdAt: new Date().toISOString(),
      bytesTransferred: 0
    };
    
    this.activeRepairs.set(repairTask.repairId, repairTask);
    repairTask.status = 'REPAIRING';
    repairTask.startedAt = new Date().toISOString();
    eventLogger.log('REPAIR_STARTED', `Repair started for object ${objectId}`, objectId, repairTask.repairId);
    
    const startTime = Date.now();

    try {
      const metadata = await metadataManager.getMetadata(objectId);
      if (!metadata) {
        throw new Error('Metadata not found');
      }

      const policy = objectService.getPolicy();
      const healthyReplicas = metadata.replicas.filter(r => r.status === 'HEALTHY');

      if (healthyReplicas.length === 0) {
        throw new Error('No healthy replicas available to repair from');
      }

      if (healthyReplicas.length >= policy.replicationFactor) {
        if (metadata.status !== 'HEALTHY') {
          await metadataManager.updateMetadata(objectId, { status: 'HEALTHY' });
          eventLogger.log('OBJECT_HEALTHY', `Object ${objectId} is now HEALTHY`, objectId);
        }
        repairTask.status = 'COMPLETED';
        repairTask.completedAt = new Date().toISOString();
        this.completedRepairs.push(repairTask);
        this.activeRepairs.delete(repairTask.repairId);
        return;
      }

      const sourceReplica = healthyReplicas[0];
      const sourceNode = nodeManager.getNode(sourceReplica.nodeId);
      if (!sourceNode || sourceNode.status !== 'ONLINE') {
        throw new Error(`Source node ${sourceReplica.nodeId} is offline`);
      }
      repairTask.sourceNodeId = sourceNode.nodeId;
      eventLogger.log('REPAIR_SOURCE_SELECTED', `Repair source selected: ${sourceNode.nodeId}`, objectId, repairTask.repairId);

      const existingNodeIds = new Set(metadata.replicas.map(r => r.nodeId));
      const allNodes = nodeManager.getAllNodes();
      
      const availableNodes = allNodes
        .filter(n => n.status === 'ONLINE' && !existingNodeIds.has(n.nodeId) && networkManager.canCommunicate(sourceNode.nodeId, n.nodeId))
        .sort((a, b) => a.usedSpace - b.usedSpace);

      if (availableNodes.length === 0) {
        throw new Error('INSUFFICIENT_REPAIR_CAPACITY');
      }

      const destNode = availableNodes[0];
      repairTask.destinationNodeId = destNode.nodeId;

      const data = await sourceNode.retrieve(objectId);
      await destNode.store(objectId, data);
      repairTask.bytesTransferred = data.length;
      eventLogger.log('REPAIR_REPLICA_WRITTEN', `Replica data written to ${destNode.nodeId}`, objectId, repairTask.repairId);

      const verifiedStatus = await integrityService.verifyReplica(destNode.nodeId, objectId, metadata.checksum);
      if (verifiedStatus !== 'HEALTHY') {
        await destNode.delete(objectId);
        throw new Error(`Integrity verification failed for repaired replica on ${destNode.nodeId}`);
      }
      eventLogger.log('REPAIR_VERIFIED', `Repaired replica verified on ${destNode.nodeId}`, objectId, repairTask.repairId);

      const existingReplicaIndex = metadata.replicas.findIndex(r => r.nodeId === destNode.nodeId);
      const newReplicaInfo = {
        nodeId: destNode.nodeId,
        status: 'HEALTHY' as const,
        version: metadata.version,
        checksum: metadata.checksum,
        size: metadata.size,
        lastVerified: new Date().toISOString()
      };

      if (existingReplicaIndex >= 0) {
        metadata.replicas[existingReplicaIndex] = newReplicaInfo;
      } else {
        metadata.replicas.push(newReplicaInfo);
      }

      const newHealthyCount = metadata.replicas.filter(r => r.status === 'HEALTHY').length;
      const newStatus = newHealthyCount >= policy.replicationFactor ? 'HEALTHY' : 'DEGRADED';
      
      await metadataManager.updateMetadata(objectId, { 
        replicas: metadata.replicas,
        status: newStatus 
      });

      eventLogger.log('REPLICA_STORED', `Repaired replica for ${objectId} on ${destNode.nodeId}`, objectId, destNode.nodeId);
      
      repairTask.status = 'COMPLETED';
      repairTask.completedAt = new Date().toISOString();
      this.completedRepairs.push(repairTask);
      this.activeRepairs.delete(repairTask.repairId);
      this.metrics.objectsRecovered++;
      this.metrics.bytesRepaired += data.length;
      this.metrics.totalRepairTimeMs += (Date.now() - startTime);

      if (newStatus === 'HEALTHY') {
        eventLogger.log('OBJECT_HEALTHY', `Object ${objectId} is now HEALTHY after repair`, objectId);
      } else {
        await this.enqueueRepair(objectId);
      }
    } catch (error: any) {
      repairTask.status = 'FAILED';
      repairTask.error = error.message;
      repairTask.completedAt = new Date().toISOString();
      this.failedRepairs.push(repairTask);
      this.activeRepairs.delete(repairTask.repairId);
      throw error;
    }
  }

  // Called when a node recovers to scan its existing replicas and mark them MISSING/STALE if they were offline
  // Or simply let integrity scan handle it.
  async handleNodeRecovery(nodeId: string) {
    // A quick way is to trigger an integrity scan
    // But for Phase 3, we should probably mark replicas that are on this node as something to check.
  }
}

export const repairService = new RepairService();
