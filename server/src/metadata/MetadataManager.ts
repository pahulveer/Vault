import fs from 'fs/promises';
import path from 'path';

export interface ReplicaInfo {
  nodeId: string;
  status: 'HEALTHY' | 'MISSING' | 'FAILED' | 'CORRUPTED' | 'STALE' | 'REPAIRING';
  version: number;
  checksum: string;
  size: number;
  lastVerified?: string;
}

export interface ObjectMetadata {
  objectId: string;
  filename: string;
  size: number;
  checksum: string;
  version: number;
  createdAt: string;
  status: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE';
  replicationFactor: number;
  replicas: ReplicaInfo[];
}

class MetadataManager {
  private metadataPath: string;
  private metadata: Map<string, ObjectMetadata> = new Map();

  constructor() {
    this.metadataPath = path.join(__dirname, '../../../storage/metadata.json');
  }

  async init() {
    try {
      await fs.mkdir(path.dirname(this.metadataPath), { recursive: true });
      try {
        const data = await fs.readFile(this.metadataPath, 'utf8');
        const parsed = JSON.parse(data);
        for (const key of Object.keys(parsed)) {
          this.metadata.set(key, parsed[key]);
        }
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          throw err;
        }
        await this.save();
      }
    } catch (err) {
      console.error('Failed to initialize metadata manager', err);
    }
  }

  private async save() {
    const data = Object.fromEntries(this.metadata);
    await fs.writeFile(this.metadataPath, JSON.stringify(data, null, 2), 'utf8');
  }

  async createMetadata(metadata: ObjectMetadata): Promise<void> {
    this.metadata.set(metadata.objectId, metadata);
    await this.save();
  }

  async getMetadata(objectId: string): Promise<ObjectMetadata | undefined> {
    return this.metadata.get(objectId);
  }

  async updateMetadata(objectId: string, updates: Partial<ObjectMetadata>): Promise<ObjectMetadata | undefined> {
    const existing = this.metadata.get(objectId);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.metadata.set(objectId, updated);
    await this.save();
    return updated;
  }

  async listObjects(): Promise<ObjectMetadata[]> {
    return Array.from(this.metadata.values());
  }

  async reset(): Promise<void> {
    this.metadata.clear();
    await this.save();
  }
}

export const metadataManager = new MetadataManager();
