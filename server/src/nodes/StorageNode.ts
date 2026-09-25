import fs from 'fs/promises';
import path from 'path';

export type NodeStatus = 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'RECOVERING';

export class NodeOfflineError extends Error {
  constructor(nodeId: string) {
    super(`Node ${nodeId} is currently OFFLINE`);
    this.name = 'NodeOfflineError';
  }
}

export class StorageNode {
  nodeId: string;
  status: NodeStatus;
  storagePath: string;
  capacity: number;
  usedSpace: number;
  objectCount: number;
  replicaCount: number;
  lastHeartbeat: string;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
    this.status = 'ONLINE';
    this.storagePath = path.join(__dirname, `../../../storage/${nodeId}`);
    this.capacity = 100 * 1024 * 1024 * 1024; // 100 GB placeholder
    this.usedSpace = 0;
    this.objectCount = 0;
    this.replicaCount = 0;
    this.lastHeartbeat = new Date().toISOString();
  }

  async init() {
    await fs.mkdir(this.storagePath, { recursive: true });
    await this.calculateUsedSpace();
  }

  private async calculateUsedSpace() {
    try {
      const files = await fs.readdir(this.storagePath);
      let size = 0;
      for (const file of files) {
        const stat = await fs.stat(path.join(this.storagePath, file));
        size += stat.size;
      }
      this.usedSpace = size;
      this.objectCount = files.length;
      this.replicaCount = files.length;
    } catch (e) {
      console.error(`Error calculating used space for node ${this.nodeId}`, e);
    }
  }

  async store(objectId: string, data: Buffer): Promise<void> {
    if (this.status === 'OFFLINE') throw new NodeOfflineError(this.nodeId);
    const objectPath = path.join(this.storagePath, objectId);
    const exists = await this.exists(objectId);
    if (exists) {
      const stat = await fs.stat(objectPath);
      this.usedSpace -= stat.size;
    } else {
      this.objectCount++;
      this.replicaCount++;
    }
    await fs.writeFile(objectPath, data);
    this.usedSpace += data.length;
  }

  async retrieve(objectId: string): Promise<Buffer> {
    if (this.status === 'OFFLINE') throw new NodeOfflineError(this.nodeId);
    const objectPath = path.join(this.storagePath, objectId);
    return await fs.readFile(objectPath);
  }

  async exists(objectId: string): Promise<boolean> {
    if (this.status === 'OFFLINE') return false;
    const objectPath = path.join(this.storagePath, objectId);
    try {
      await fs.access(objectPath);
      return true;
    } catch {
      return false;
    }
  }

  async delete(objectId: string): Promise<boolean> {
    if (this.status === 'OFFLINE') throw new NodeOfflineError(this.nodeId);
    const objectPath = path.join(this.storagePath, objectId);
    try {
      const stat = await fs.stat(objectPath);
      await fs.unlink(objectPath);
      this.usedSpace -= stat.size;
      this.objectCount--;
      this.replicaCount--;
      return true;
    } catch {
      return false;
    }
  }

  private heartbeatInterval: NodeJS.Timeout | null = null;

  startSimulation() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(() => {
      if (this.status === 'ONLINE' || this.status === 'DEGRADED') {
        this.lastHeartbeat = new Date().toISOString();
      }
    }, 2000);
  }

  stopSimulation() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  getStats() {
    return {
      nodeId: this.nodeId,
      status: this.status,
      storagePath: this.storagePath,
      capacity: this.capacity,
      usedSpace: this.usedSpace,
      objectCount: this.objectCount,
      replicaCount: this.replicaCount,
      lastHeartbeat: this.lastHeartbeat
    };
  }

  fail() {
    this.status = 'OFFLINE';
  }

  recover() {
    this.status = 'ONLINE';
    this.lastHeartbeat = new Date().toISOString();
  }
}
