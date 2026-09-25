import { createHash } from 'crypto';
import { StorageNode } from './StorageNode';

export interface ReplicationPolicy {
  replicationFactor: number;
  writeQuorum: number;
  readQuorum: number;
}

export const defaultPolicy: ReplicationPolicy = {
  replicationFactor: 3,
  writeQuorum: 2,
  readQuorum: 2,
};

class PlacementEngine {
  getPlacementNodes(objectId: string, allNodes: StorageNode[], policy: ReplicationPolicy = defaultPolicy): StorageNode[] {
    if (allNodes.length === 0) return [];
    
    // Sort nodes deterministically by ID
    const sortedNodes = [...allNodes].sort((a, b) => a.nodeId.localeCompare(b.nodeId));
    
    // Hash objectId to find a starting index
    const hash = createHash('sha256').update(objectId).digest('hex');
    const hashNum = parseInt(hash.substring(0, 8), 16);
    
    const startIndex = hashNum % sortedNodes.length;
    
    const selectedNodes: StorageNode[] = [];
    for (let i = 0; i < policy.replicationFactor; i++) {
      const index = (startIndex + i) % sortedNodes.length;
      const node = sortedNodes[index];
      if (!selectedNodes.includes(node)) {
        selectedNodes.push(node);
      }
    }
    
    return selectedNodes;
  }
}

export const placementEngine = new PlacementEngine();
