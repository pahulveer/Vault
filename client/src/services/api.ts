import type {
  StorageNode,
  ObjectMetadata,
  ReplicaInfo,
  SystemEvent,
  ReplicationPolicy,
  StorageMetrics,
  RecoveryMetrics,
  RepairTaskItem,
  NetworkPartition,
  RebalanceTaskItem,
  RebalanceMetrics,
  IntegrityScanResult
} from '../types';
import { mockApiService } from './mockApi';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

let isMockMode = false;
export const setMockMode = (enabled: boolean) => {
  isMockMode = enabled;
};
export const getMockMode = () => isMockMode;

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errMsg = `Request failed: ${res.status} ${res.statusText}`;
    try {
      const errJson = await res.json();
      if (errJson && errJson.error) {
        errMsg = errJson.error + (errJson.message ? `: ${errJson.message}` : '');
      } else if (errJson && errJson.message) {
        errMsg = errJson.message;
      }
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }
  return res.json();
}

export const apiService = {
  getHealth: async (): Promise<{ status: string }> => {
    if (isMockMode) return mockApiService.getHealth();
    const res = await fetch(`${API_BASE_URL}/health`);
    return handleResponse(res);
  },

  getNodes: async (): Promise<StorageNode[]> => {
    if (isMockMode) return mockApiService.getNodes();
    const res = await fetch(`${API_BASE_URL}/nodes`);
    return handleResponse(res);
  },

  addNode: async (nodeId: string): Promise<{ message: string; status: string }> => {
    if (isMockMode) return mockApiService.addNode(nodeId);
    const res = await fetch(`${API_BASE_URL}/nodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodeId })
    });
    return handleResponse(res);
  },

  failNode: async (nodeId: string): Promise<{ message: string; status: string }> => {
    if (isMockMode) return mockApiService.failNode(nodeId);
    const res = await fetch(`${API_BASE_URL}/nodes/${nodeId}/fail`, { method: 'POST' });
    return handleResponse(res);
  },

  recoverNode: async (nodeId: string): Promise<{ message: string; status: string }> => {
    if (isMockMode) return mockApiService.recoverNode(nodeId);
    const res = await fetch(`${API_BASE_URL}/nodes/${nodeId}/recover`, { method: 'POST' });
    return handleResponse(res);
  },

  getObjects: async (): Promise<ObjectMetadata[]> => {
    if (isMockMode) return mockApiService.getObjects();
    const res = await fetch(`${API_BASE_URL}/objects`);
    return handleResponse(res);
  },

  getObjectReplicas: async (objectId: string): Promise<ReplicaInfo[]> => {
    if (isMockMode) return mockApiService.getObjectReplicas(objectId);
    const res = await fetch(`${API_BASE_URL}/objects/${objectId}/replicas`);
    return handleResponse(res);
  },

  uploadObject: async (file: File): Promise<ObjectMetadata> => {
    if (isMockMode) return mockApiService.uploadObject(file);
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE_URL}/objects`, {
      method: 'POST',
      body: formData
    });
    return handleResponse(res);
  },

  getDownloadUrl: (objectId: string): string => {
    if (isMockMode) return mockApiService.getDownloadUrl(objectId);
    return `${API_BASE_URL}/objects/${objectId}`;
  },

  downloadObject: async (objectId: string): Promise<Blob> => {
    if (isMockMode) return mockApiService.downloadObject(objectId);
    const res = await fetch(`${API_BASE_URL}/objects/${objectId}`);
    if (!res.ok) throw new Error(`Download failed: ${res.statusText}`);
    return res.blob();
  },

  getPolicy: async (): Promise<ReplicationPolicy> => {
    if (isMockMode) return mockApiService.getPolicy();
    const res = await fetch(`${API_BASE_URL}/policy`);
    return handleResponse(res);
  },

  updatePolicy: async (policy: ReplicationPolicy): Promise<{ message: string; policy: ReplicationPolicy }> => {
    if (isMockMode) return mockApiService.updatePolicy(policy);
    const res = await fetch(`${API_BASE_URL}/policy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(policy)
    });
    return handleResponse(res);
  },

  getStorageMetrics: async (): Promise<StorageMetrics> => {
    if (isMockMode) return mockApiService.getStorageMetrics();
    const res = await fetch(`${API_BASE_URL}/metrics/storage`);
    return handleResponse(res);
  },

  getRecoveryMetrics: async (): Promise<RecoveryMetrics> => {
    if (isMockMode) return mockApiService.getRecoveryMetrics();
    const res = await fetch(`${API_BASE_URL}/metrics/recovery`);
    return handleResponse(res);
  },

  getRepairs: async (): Promise<RepairTaskItem[]> => {
    if (isMockMode) return mockApiService.getRepairs();
    const res = await fetch(`${API_BASE_URL}/repairs`);
    return handleResponse(res);
  },

  getPartitions: async (): Promise<NetworkPartition[]> => {
    if (isMockMode) return mockApiService.getPartitions();
    const res = await fetch(`${API_BASE_URL}/network`);
    return handleResponse(res);
  },

  getNetwork: async (): Promise<NetworkPartition[]> => {
    return apiService.getPartitions();
  },

  partitionNodes: async (nodeA: string, nodeB: string): Promise<{ message: string }> => {
    if (isMockMode) return mockApiService.partitionNodes(nodeA, nodeB);
    const res = await fetch(`${API_BASE_URL}/network/partition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodeA, nodeB })
    });
    return handleResponse(res);
  },

  createPartition: async (nodeA: string, nodeB: string): Promise<{ message: string }> => {
    return apiService.partitionNodes(nodeA, nodeB);
  },

  healPartition: async (nodeA: string, nodeB: string): Promise<{ message: string }> => {
    if (isMockMode) return mockApiService.healPartition(nodeA, nodeB);
    const res = await fetch(`${API_BASE_URL}/network/heal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodeA, nodeB })
    });
    return handleResponse(res);
  },

  getRebalanceTasks: async (): Promise<{
    active: RebalanceTaskItem[];
    queued: RebalanceTaskItem[];
    completed: RebalanceTaskItem[];
    failed: RebalanceTaskItem[];
  }> => {
    if (isMockMode) return { active: [], queued: [], completed: [], failed: [] };
    const res = await fetch(`${API_BASE_URL}/rebalance`);
    return handleResponse(res);
  },

  getRebalanceMetrics: async (): Promise<RebalanceMetrics> => {
    if (isMockMode) return mockApiService.getRebalanceMetrics();
    const res = await fetch(`${API_BASE_URL}/metrics/rebalance`);
    return handleResponse(res);
  },

  triggerRebalance: async (): Promise<{ message: string }> => {
    if (isMockMode) {
      await mockApiService.runRebalance();
      return { message: 'Rebalance triggered' };
    }
    const res = await fetch(`${API_BASE_URL}/rebalance/scan`, { method: 'POST' });
    return handleResponse(res);
  },

  getEvents: async (): Promise<SystemEvent[]> => {
    if (isMockMode) return mockApiService.getEvents();
    const res = await fetch(`${API_BASE_URL}/events`);
    return handleResponse(res);
  },

  scanIntegrity: async (): Promise<IntegrityScanResult> => {
    if (isMockMode) return mockApiService.runIntegrityScan();
    const res = await fetch(`${API_BASE_URL}/integrity/scan`, { method: 'POST' });
    return handleResponse(res);
  }
};
