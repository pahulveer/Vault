export type NodeStatus = 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'RECOVERING';
export type ObjectStatus = 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE';
export type ReplicaStatus = 'HEALTHY' | 'MISSING' | 'CORRUPTED' | 'STALE' | 'REPAIRING' | 'FAILED';

export interface StorageNode {
  nodeId: string;
  status: NodeStatus;
  storagePath: string;
  capacity: number;
  usedSpace: number;
  objectCount: number;
  replicaCount: number;
  lastHeartbeat: string;
}

export interface ReplicaInfo {
  nodeId: string;
  status: ReplicaStatus;
  version?: number;
  size?: number;
  checksum?: string;
  lastVerified?: string;
}

export interface ObjectMetadata {
  objectId: string;
  filename: string;
  size: number;
  checksum: string;
  version: number;
  createdAt: string;
  status: ObjectStatus;
  replicationFactor?: number;
  replicas: ReplicaInfo[];
}

export interface SystemEvent {
  eventId: string;
  type: string;
  timestamp: string;
  message: string;
  objectId?: string;
  nodeId?: string;
}

export interface ReplicationPolicy {
  replicationFactor: number;
  writeQuorum: number;
  readQuorum: number;
}

export interface StorageMetrics {
  logicalStorage: number;
  physicalStorage: number;
  replicationOverhead: number;
  totalCapacity: number;
  usedCapacity: number;
  availableCapacity: number;
  totalObjects: number;
}

export interface RecoveryMetrics {
  activeRepairs: number;
  queuedRepairs: number;
  completedRepairs: number;
  failedRepairs: number;
  averageRepairTimeMs: number;
  objectsRecovered: number;
  bytesRepaired: number;
}

export interface RepairTaskItem {
  taskId: string;
  objectId: string;
  targetNodeId?: string;
  sourceNodeId?: string;
  priority: number | string;
  status: 'PENDING' | 'QUEUED' | 'REPAIRING' | 'COMPLETED' | 'FAILED';
  createdAt?: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
}

export interface NetworkPartition {
  nodeA: string;
  nodeB: string;
}

export interface RebalanceTaskItem {
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

export interface RebalanceMetrics {
  active: number;
  queued: number;
  completed: number;
  failed: number;
  objectsRebalanced: number;
  bytesRebalanced: number;
  averageTimeMs: number;
}

export interface IntegrityScanResult {
  totalReplicas: number;
  healthyReplicas: number;
  corruptedReplicas: number;
  missingReplicas: number;
  staleReplicas: number;
}
