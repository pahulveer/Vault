import type {
  StorageNode,
  ObjectMetadata,
  SystemEvent,
  ReplicationPolicy,
  StorageMetrics,
  RecoveryMetrics,
  RepairTaskItem,
  NetworkPartition,
  RebalanceTaskItem,
  RebalanceMetrics,
  IntegrityScanResult,
  ReplicaInfo
} from '../types';

let mockNodes: StorageNode[] = [
  { nodeId: 'node-01', status: 'ONLINE', storagePath: '/storage/node-01', capacity: 100 * 1024 * 1024 * 1024, usedSpace: 450, objectCount: 3, replicaCount: 3, lastHeartbeat: new Date().toISOString() },
  { nodeId: 'node-02', status: 'ONLINE', storagePath: '/storage/node-02', capacity: 100 * 1024 * 1024 * 1024, usedSpace: 450, objectCount: 3, replicaCount: 3, lastHeartbeat: new Date().toISOString() },
  { nodeId: 'node-03', status: 'ONLINE', storagePath: '/storage/node-03', capacity: 100 * 1024 * 1024 * 1024, usedSpace: 450, objectCount: 3, replicaCount: 3, lastHeartbeat: new Date().toISOString() },
  { nodeId: 'node-04', status: 'ONLINE', storagePath: '/storage/node-04', capacity: 100 * 1024 * 1024 * 1024, usedSpace: 0, objectCount: 0, replicaCount: 0, lastHeartbeat: new Date().toISOString() }
];

let mockObjects: ObjectMetadata[] = [
  {
    objectId: 'obj_0a1b2c3d4e5f',
    filename: 'dataset-ml-training.parquet',
    size: 150,
    checksum: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    status: 'HEALTHY',
    version: 1,
    replicationFactor: 3,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    replicas: [
      { nodeId: 'node-01', status: 'HEALTHY', version: 1, checksum: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', size: 150, lastVerified: new Date().toISOString() },
      { nodeId: 'node-02', status: 'HEALTHY', version: 1, checksum: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', size: 150, lastVerified: new Date().toISOString() },
      { nodeId: 'node-03', status: 'HEALTHY', version: 1, checksum: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', size: 150, lastVerified: new Date().toISOString() }
    ]
  },
  {
    objectId: 'obj_7g8h9i0j1k2l',
    filename: 'financial-ledger-2026.json',
    size: 124,
    checksum: 'sha256:2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
    status: 'HEALTHY',
    version: 1,
    replicationFactor: 3,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    replicas: [
      { nodeId: 'node-01', status: 'HEALTHY', version: 1, checksum: 'sha256:2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae', size: 124, lastVerified: new Date().toISOString() },
      { nodeId: 'node-02', status: 'HEALTHY', version: 1, checksum: 'sha256:2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae', size: 124, lastVerified: new Date().toISOString() },
      { nodeId: 'node-03', status: 'HEALTHY', version: 1, checksum: 'sha256:2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae', size: 124, lastVerified: new Date().toISOString() }
    ]
  }
];

let mockEvents: SystemEvent[] = [
  { eventId: 'evt_1', timestamp: new Date(Date.now() - 60000).toISOString(), type: 'CLUSTER_STARTED', message: 'Vault cluster initialized with 4 nodes', nodeId: 'cluster' },
  { eventId: 'evt_2', timestamp: new Date(Date.now() - 40000).toISOString(), type: 'OBJECT_UPLOADED', message: 'Object dataset-ml-training.parquet stored with 3 replicas', objectId: 'obj_0a1b2c3d4e5f' },
  { eventId: 'evt_3', timestamp: new Date(Date.now() - 20000).toISOString(), type: 'OBJECT_UPLOADED', message: 'Object financial-ledger-2026.json stored with 3 replicas', objectId: 'obj_7g8h9i0j1k2l' }
];

let mockPolicy: ReplicationPolicy = { replicationFactor: 3, writeQuorum: 2, readQuorum: 2 };
let mockPartitions: NetworkPartition[] = [];
let mockRepairs: RepairTaskItem[] = [];
let mockRebalanceTasks: RebalanceTaskItem[] = [];

export const mockApiService = {
  getHealth: async (): Promise<{ status: string }> => ({ status: 'healthy' }),

  getNodes: async (): Promise<StorageNode[]> => [...mockNodes],

  addNode: async (nodeId: string): Promise<{ message: string; status: string }> => {
    mockNodes.push({
      nodeId,
      status: 'ONLINE',
      storagePath: `/storage/${nodeId}`,
      capacity: 100 * 1024 * 1024 * 1024,
      usedSpace: 0,
      objectCount: 0,
      replicaCount: 0,
      lastHeartbeat: new Date().toISOString()
    });
    mockEvents.unshift({
      eventId: `evt_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'NODE_ADDED',
      message: `Storage node ${nodeId} joined the cluster`,
      nodeId
    });
    return { message: `Node ${nodeId} added`, status: 'ONLINE' };
  },

  failNode: async (nodeId: string): Promise<{ message: string; status: string }> => {
    const n = mockNodes.find(x => x.nodeId === nodeId);
    if (n) n.status = 'OFFLINE';
    mockEvents.unshift({
      eventId: `evt_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'NODE_FAILED',
      message: `Storage node ${nodeId} marked OFFLINE`,
      nodeId
    });
    return { message: `Node ${nodeId} failed`, status: 'OFFLINE' };
  },

  recoverNode: async (nodeId: string): Promise<{ message: string; status: string }> => {
    const n = mockNodes.find(x => x.nodeId === nodeId);
    if (n) n.status = 'ONLINE';
    mockEvents.unshift({
      eventId: `evt_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'NODE_RECOVERED',
      message: `Storage node ${nodeId} recovered and validated`,
      nodeId
    });
    return { message: `Node ${nodeId} recovered`, status: 'ONLINE' };
  },

  getObjects: async (): Promise<ObjectMetadata[]> => [...mockObjects],

  getObjectReplicas: async (objectId: string): Promise<ReplicaInfo[]> => {
    const obj = mockObjects.find(o => o.objectId === objectId);
    return obj ? [...obj.replicas] : [];
  },

  uploadObject: async (file: File): Promise<ObjectMetadata> => {
    const newObj: ObjectMetadata = {
      objectId: `obj_${Date.now().toString(16)}`,
      filename: file.name,
      size: file.size,
      checksum: 'sha256:5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
      status: 'HEALTHY',
      version: 1,
      replicationFactor: 3,
      createdAt: new Date().toISOString(),
      replicas: [
        { nodeId: 'node-01', status: 'HEALTHY', version: 1, checksum: 'sha256:5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', size: file.size, lastVerified: new Date().toISOString() },
        { nodeId: 'node-02', status: 'HEALTHY', version: 1, checksum: 'sha256:5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', size: file.size, lastVerified: new Date().toISOString() },
        { nodeId: 'node-03', status: 'HEALTHY', version: 1, checksum: 'sha256:5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', size: file.size, lastVerified: new Date().toISOString() }
      ]
    };
    mockObjects.unshift(newObj);
    mockEvents.unshift({
      eventId: `evt_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'OBJECT_UPLOADED',
      message: `Object ${file.name} uploaded and replicated 3×`,
      objectId: newObj.objectId
    });
    return newObj;
  },

  getDownloadUrl: (objectId: string): string => {
    return `#/download/${objectId}`;
  },

  downloadObject: async (objectId: string): Promise<Blob> => {
    const obj = mockObjects.find(o => o.objectId === objectId);
    return new Blob([`Simulated content for ${obj?.filename || objectId}`], { type: 'text/plain' });
  },

  getPolicy: async (): Promise<ReplicationPolicy> => ({ ...mockPolicy }),

  updatePolicy: async (policy: ReplicationPolicy): Promise<{ message: string; policy: ReplicationPolicy }> => {
    mockPolicy = { ...policy };
    return { message: 'Policy updated', policy: { ...mockPolicy } };
  },

  getStorageMetrics: async (): Promise<StorageMetrics> => {
    const logical = mockObjects.reduce((acc, o) => acc + o.size, 0);
    const physical = logical * 3;
    return {
      logicalStorage: logical,
      physicalStorage: physical,
      replicationOverhead: 3,
      totalCapacity: 400 * 1024 * 1024 * 1024,
      usedCapacity: physical,
      availableCapacity: 400 * 1024 * 1024 * 1024 - physical,
      totalObjects: mockObjects.length
    };
  },

  runIntegrityScan: async (): Promise<IntegrityScanResult> => ({
    totalReplicas: mockObjects.length * 3,
    healthyReplicas: mockObjects.length * 3,
    corruptedReplicas: 0,
    missingReplicas: 0,
    staleReplicas: 0
  }),

  getEvents: async (): Promise<SystemEvent[]> => [...mockEvents],

  getRecoveryMetrics: async (): Promise<RecoveryMetrics> => ({
    activeRepairs: mockRepairs.filter(r => r.status === 'REPAIRING').length,
    queuedRepairs: 0,
    completedRepairs: 12,
    failedRepairs: 0,
    averageRepairTimeMs: 142,
    objectsRecovered: 12,
    bytesRepaired: 1800
  }),

  getRepairs: async (): Promise<RepairTaskItem[]> => [...mockRepairs],

  getPartitions: async (): Promise<NetworkPartition[]> => [...mockPartitions],

  partitionNodes: async (nodeA: string, nodeB: string): Promise<{ message: string }> => {
    mockPartitions.push({ nodeA, nodeB });
    mockEvents.unshift({
      eventId: `evt_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'NETWORK_PARTITION',
      message: `Partition created between ${nodeA} and ${nodeB}`
    });
    return { message: `Partition created between ${nodeA} and ${nodeB}` };
  },

  healPartition: async (nodeA: string, nodeB: string): Promise<{ message: string }> => {
    mockPartitions = mockPartitions.filter(p => !(p.nodeA === nodeA && p.nodeB === nodeB));
    mockEvents.unshift({
      eventId: `evt_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'NETWORK_HEALED',
      message: `Network healed between ${nodeA} and ${nodeB}`
    });
    return { message: `Network healed between ${nodeA} and ${nodeB}` };
  },

  getRebalanceTasks: async (): Promise<RebalanceTaskItem[]> => [...mockRebalanceTasks],

  runRebalance: async (): Promise<{ message: string; tasksCount: number }> => {
    mockEvents.unshift({
      eventId: `evt_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'REBALANCE_STARTED',
      message: 'Deterministic hash ring rebalance executed'
    });
    return { message: 'Rebalance executed successfully', tasksCount: 0 };
  },

  getRebalanceMetrics: async (): Promise<RebalanceMetrics> => ({
    active: 0,
    queued: 0,
    completed: 4,
    failed: 0,
    objectsRebalanced: 4,
    bytesRebalanced: 850,
    averageTimeMs: 120
  })
};
