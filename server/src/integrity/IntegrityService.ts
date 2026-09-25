import crypto from 'crypto';
import { nodeManager } from '../nodes/NodeManager';
import { eventLogger } from '../events/EventLogger';

class IntegrityService {
  calculateChecksum(data: Buffer): string {
    const hash = crypto.createHash('sha256');
    hash.update(data);
    return `sha256:${hash.digest('hex')}`;
  }

  verifyChecksum(data: Buffer, expectedChecksum: string): boolean {
    const actualChecksum = this.calculateChecksum(data);
    return actualChecksum === expectedChecksum;
  }

  async verifyReplica(nodeId: string, objectId: string, expectedChecksum: string): Promise<'HEALTHY' | 'MISSING' | 'CORRUPTED'> {
    const node = nodeManager.getNode(nodeId);
    if (!node) return 'MISSING';
    
    try {
      if (!await node.exists(objectId)) {
        return 'MISSING';
      }
      
      const data = await node.retrieve(objectId);
      if (this.verifyChecksum(data, expectedChecksum)) {
        return 'HEALTHY';
      } else {
        eventLogger.log('REPLICA_CORRUPTED', `Replica corruption detected for ${objectId} on ${nodeId}`, objectId, nodeId);
        return 'CORRUPTED';
      }
    } catch (err) {
      return 'MISSING';
    }
  }
}

export const integrityService = new IntegrityService();
