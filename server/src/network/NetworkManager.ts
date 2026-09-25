import { eventLogger } from '../events/EventLogger';

class NetworkManager {
  // Store partitions as a set of sorted pairs: "nodeA:nodeB"
  private partitions: Set<string> = new Set();

  partition(nodeA: string, nodeB: string) {
    const key = this.getKey(nodeA, nodeB);
    this.partitions.add(key);
    eventLogger.log('NETWORK_PARTITION', `Partition created between ${nodeA} and ${nodeB}`);
  }

  heal(nodeA: string, nodeB: string) {
    const key = this.getKey(nodeA, nodeB);
    this.partitions.delete(key);
    eventLogger.log('NETWORK_HEALED', `Partition healed between ${nodeA} and ${nodeB}`);
  }

  canCommunicate(nodeA: string, nodeB: string): boolean {
    if (nodeA === nodeB) return true;
    return !this.partitions.has(this.getKey(nodeA, nodeB));
  }

  getPartitions() {
    return Array.from(this.partitions).map(p => {
      const [nodeA, nodeB] = p.split(':');
      return { nodeA, nodeB };
    });
  }

  reset() {
    this.partitions.clear();
  }

  private getKey(nodeA: string, nodeB: string): string {
    return nodeA < nodeB ? `${nodeA}:${nodeB}` : `${nodeB}:${nodeA}`;
  }
}

export const networkManager = new NetworkManager();
