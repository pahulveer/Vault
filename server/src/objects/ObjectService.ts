import { randomUUID } from 'crypto';
import { nodeManager } from '../nodes/NodeManager';
import { metadataManager, ObjectMetadata, ReplicaInfo } from '../metadata/MetadataManager';
import { integrityService } from '../integrity/IntegrityService';
import { eventLogger } from '../events/EventLogger';
import { placementEngine, defaultPolicy, ReplicationPolicy } from '../nodes/PlacementEngine';
import { networkManager } from '../network/NetworkManager';

class ObjectService {
  private policy: ReplicationPolicy = defaultPolicy;

  getPolicy(): ReplicationPolicy {
    return this.policy;
  }

  setPolicy(policy: ReplicationPolicy) {
    this.policy = policy;
  }

  async storeObject(filename: string, data: Buffer): Promise<ObjectMetadata> {
    const objectId = `obj_${randomUUID().replace(/-/g, '')}`;
    const size = data.length;
    const checksum = integrityService.calculateChecksum(data);
    
    const allNodes = nodeManager.getAllNodes();
    const targetNodes = placementEngine.getPlacementNodes(objectId, allNodes, this.policy);
    
    if (targetNodes.length < this.policy.writeQuorum) {
       throw new Error(`Insufficient nodes available for write quorum. Required: ${this.policy.writeQuorum}, Available: ${targetNodes.length}`);
    }

    const replicas: ReplicaInfo[] = [];
    let successCount = 0;
    const coordinatorId = nodeManager.getPrimaryNode().nodeId;

    for (const node of targetNodes) {
      if (!networkManager.canCommunicate(coordinatorId, node.nodeId)) {
        eventLogger.log('NETWORK_PARTITION_ERROR', `Cannot communicate with ${node.nodeId} from ${coordinatorId} due to partition`, objectId, node.nodeId);
        replicas.push({
          nodeId: node.nodeId,
          status: 'FAILED',
          version: 1,
          checksum,
          size,
          lastVerified: new Date().toISOString()
        });
        continue;
      }
      try {
        await node.store(objectId, data);
        replicas.push({
          nodeId: node.nodeId,
          status: 'HEALTHY',
          version: 1,
          checksum,
          size,
          lastVerified: new Date().toISOString()
        });
        successCount++;
        eventLogger.log('REPLICA_STORED', `Replica for ${objectId} stored on ${node.nodeId}`, objectId, node.nodeId);
      } catch (error) {
        replicas.push({
          nodeId: node.nodeId,
          status: 'FAILED',
          version: 1,
          checksum,
          size,
          lastVerified: new Date().toISOString()
        });
        eventLogger.log('REPLICA_FAILED', `Failed to store replica for ${objectId} on ${node.nodeId}`, objectId, node.nodeId);
      }
    }

    if (successCount < this.policy.writeQuorum) {
      // Rollback (best effort)
      for (const replica of replicas) {
        if (replica.status === 'HEALTHY') {
          const node = nodeManager.getNode(replica.nodeId);
          if (node && networkManager.canCommunicate(coordinatorId, replica.nodeId)) {
            await node.delete(objectId);
          }
        }
      }
      throw new Error(`Write failed. Reached ${successCount} nodes, required ${this.policy.writeQuorum}`);
    }
    
    const status = successCount === this.policy.replicationFactor ? 'HEALTHY' : 'DEGRADED';
    
    // Store metadata
    const metadata: ObjectMetadata = {
      objectId,
      filename,
      size,
      checksum,
      version: 1,
      createdAt: new Date().toISOString(),
      status,
      replicationFactor: this.policy.replicationFactor,
      replicas
    };
    
    await metadataManager.createMetadata(metadata);
    
    eventLogger.log('OBJECT_UPLOADED', `Object ${objectId} (${filename}) uploaded with status ${status}`, objectId);
    
    return metadata;
  }

  async getObject(objectId: string): Promise<{ data: Buffer, metadata: ObjectMetadata }> {
    const metadata = await metadataManager.getMetadata(objectId);
    if (!metadata) {
      throw new Error(`Object ${objectId} not found in metadata`);
    }

    // Try to read from healthy replicas
    const healthyReplicas = metadata.replicas.filter(r => r.status === 'HEALTHY');
    const coordinatorId = nodeManager.getPrimaryNode().nodeId;
    
    for (const replica of healthyReplicas) {
      const node = nodeManager.getNode(replica.nodeId);
      if (node && networkManager.canCommunicate(coordinatorId, replica.nodeId) && await node.exists(objectId)) {
        try {
          const data = await node.retrieve(objectId);
          
          // Verify integrity
          const checksum = integrityService.calculateChecksum(data);
          if (checksum === metadata.checksum) {
            return { data, metadata };
          } else {
             eventLogger.log('REPLICA_CORRUPTED', `Corrupted replica found during read for ${objectId} on ${node.nodeId}`, objectId, node.nodeId);
          }
        } catch (error) {
           console.error(`Error reading from node ${node.nodeId}`, error);
        }
      }
    }

    throw new Error(`No valid replica found for object ${objectId}`);
  }
}

export const objectService = new ObjectService();
