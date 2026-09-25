import { StorageNode } from './StorageNode';
import { eventLogger } from '../events/EventLogger';
import { metadataManager } from '../metadata/MetadataManager';
import { repairService } from '../repair/RepairService';
import { objectService } from '../objects/ObjectService';
import { integrityService } from '../integrity/IntegrityService';

class NodeManager {
  private nodes: Map<string, StorageNode> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL_MS = 2000;
  private readonly FAILURE_TIMEOUT_MS = 6000;

  async init() {
    const nodeIds = ['node-01', 'node-02', 'node-03', 'node-04'];
    
    for (const id of nodeIds) {
      await this.addNode(id, true);
    }
    
    this.startHeartbeatMonitor();
  }

  async addNode(nodeId: string, isInit = false) {
    if (this.nodes.has(nodeId)) {
      throw new Error(`Node ${nodeId} already exists`);
    }
    const node = new StorageNode(nodeId);
    await node.init();
    node.startSimulation();
    this.nodes.set(nodeId, node);
    if (isInit) {
      eventLogger.log('NODE_STARTED', `Storage node ${nodeId} initialized and is ONLINE`, undefined, nodeId);
    } else {
      eventLogger.log('NODE_ADDED', `Storage node ${nodeId} added and is ONLINE`, undefined, nodeId);
    }
    return node;
  }
  
  private startHeartbeatMonitor() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(() => this.checkHeartbeats(), this.HEARTBEAT_INTERVAL_MS);
  }

  private async checkHeartbeats() {
    const now = Date.now();
    for (const node of this.nodes.values()) {
      if (node.status === 'ONLINE' || node.status === 'DEGRADED') {
        const lastHeartbeatMs = new Date(node.lastHeartbeat).getTime();
        if (now - lastHeartbeatMs > this.FAILURE_TIMEOUT_MS) {
          await this.failNode(node.nodeId, 'Heartbeat timeout');
        }
      }
    }
  }

  async failNode(nodeId: string, reason: string = 'Manual failure') {
    const node = this.nodes.get(nodeId);
    if (!node || node.status === 'OFFLINE') return;
    
    node.fail();
    eventLogger.log('NODE_FAILED', `Node ${nodeId} failed: ${reason}`, undefined, nodeId);
    
    const policy = objectService.getPolicy();
    const objects = await metadataManager.listObjects();
    
    for (const obj of objects) {
      if (!obj.replicas) continue;
      
      let updated = false;
      for (const replica of obj.replicas) {
        if (replica.nodeId === nodeId && (replica.status === 'HEALTHY' || replica.status === 'STALE')) {
          replica.status = 'MISSING';
          updated = true;
          eventLogger.log('REPLICA_MARKED_MISSING', `Replica for ${obj.objectId} on ${nodeId} marked MISSING`, obj.objectId, nodeId);
        }
      }
      
      if (updated) {
        const healthyCount = obj.replicas.filter(r => r.status === 'HEALTHY').length;
        let newStatus: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE' = obj.status;
        let priority = 0;
        
        if (healthyCount >= policy.replicationFactor) {
          newStatus = 'HEALTHY';
        } else if (healthyCount >= policy.writeQuorum) {
          newStatus = 'DEGRADED';
          priority = 1;
        } else if (healthyCount > 0) {
          newStatus = 'UNAVAILABLE'; // Or DEGRADED but very low healthy count
          priority = 2;
        } else {
          newStatus = 'UNAVAILABLE';
          priority = 2;
        }
        
        obj.status = newStatus;
        await metadataManager.updateMetadata(obj.objectId, { replicas: obj.replicas, status: newStatus });
        
        if (newStatus === 'DEGRADED' || newStatus === 'UNAVAILABLE') {
          await repairService.enqueueRepair(obj.objectId, priority);
        }
      }
    }
  }

  async recoverNode(nodeId: string) {
    const node = this.nodes.get(nodeId);
    if (!node) return;
    
    node.status = 'RECOVERING';
    eventLogger.log('NODE_RECOVERING', `Node ${nodeId} entering recovery state`, undefined, nodeId);
    
    const objects = await metadataManager.listObjects();
    const policy = objectService.getPolicy();
    
    for (const obj of objects) {
      if (!obj.replicas) continue;
      const replica = obj.replicas.find(r => r.nodeId === nodeId);
      if (replica) {
        if (await node.exists(obj.objectId)) {
           const status = await integrityService.verifyReplica(nodeId, obj.objectId, obj.checksum);
           
           if (status === 'CORRUPTED') {
             replica.status = 'CORRUPTED';
           } else if (status === 'HEALTHY') {
             // Check if stale
             if (replica.version < obj.version) {
               replica.status = 'STALE';
             } else {
               replica.status = 'HEALTHY';
             }
           } else {
             replica.status = 'MISSING';
           }
        } else {
           replica.status = 'MISSING';
        }
        
        const healthyCount = obj.replicas.filter(r => r.status === 'HEALTHY').length;
        let newStatus: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE' = obj.status;
        let priority = 0;
        
        if (healthyCount >= policy.replicationFactor) {
          newStatus = 'HEALTHY';
        } else if (healthyCount >= policy.writeQuorum) {
          newStatus = 'DEGRADED';
          priority = 1;
        } else {
          newStatus = 'UNAVAILABLE';
          priority = 2;
        }
        
        obj.status = newStatus;
        await metadataManager.updateMetadata(obj.objectId, { replicas: obj.replicas, status: newStatus });
        
        if (newStatus === 'DEGRADED' || newStatus === 'UNAVAILABLE') {
          await repairService.enqueueRepair(obj.objectId, priority);
        }
      }
    }
    
    node.recover();
    eventLogger.log('NODE_RECOVERED', `Node ${nodeId} fully recovered`, undefined, nodeId);
  }

  getNode(nodeId: string): StorageNode | undefined {
    return this.nodes.get(nodeId);
  }

  getAllNodes(): StorageNode[] {
    return Array.from(this.nodes.values());
  }

  // Phase 1 shortcut: Always use node-01 for uploads
  getPrimaryNode(): StorageNode {
    const node = this.nodes.get('node-01');
    if (!node) throw new Error('Primary node node-01 not found');
    return node;
  }

  async reset() {
    const defaultIds = new Set(['node-01', 'node-02', 'node-03', 'node-04']);
    for (const [id, node] of this.nodes.entries()) {
      if (!defaultIds.has(id)) {
        node.stopSimulation();
        this.nodes.delete(id);
      }
    }

    for (const id of ['node-01', 'node-02', 'node-03', 'node-04']) {
      let node = this.nodes.get(id);
      if (!node) {
        node = new StorageNode(id);
        await node.init();
        node.startSimulation();
        this.nodes.set(id, node);
      } else {
        node.recover();
        await node.init();
        node.startSimulation();
      }
    }
  }
}

export const nodeManager = new NodeManager();
