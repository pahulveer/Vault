import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import type { NavTab } from './components/layout/Sidebar';
import { OverviewView } from './components/overview/OverviewView';
import { StorageVisualization } from './components/storage/StorageVisualization';
import { ObjectBrowser } from './components/objects/ObjectBrowser';
import { NodesView } from './components/nodes/NodesView';
import { ReplicationView } from './components/replication/ReplicationView';
import { RepairsView } from './components/repairs/RepairsView';
import { NetworkMatrix } from './components/network/NetworkMatrix';
import { RebalanceView } from './components/rebalance/RebalanceView';
import { EventsStream } from './components/events/EventsStream';
import { SettingsView } from './components/settings/SettingsView';
import { LoadingState } from './components/common/LoadingState';
import { ErrorState } from './components/common/ErrorState';
import { apiService, setMockMode, getMockMode } from './services/api';
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
  RebalanceMetrics
} from './types';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [nodes, setNodes] = useState<StorageNode[]>([]);
  const [objects, setObjects] = useState<ObjectMetadata[]>([]);
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [policy, setPolicy] = useState<ReplicationPolicy | null>(null);
  const [storageMetrics, setStorageMetrics] = useState<StorageMetrics | null>(null);
  const [recoveryMetrics, setRecoveryMetrics] = useState<RecoveryMetrics | null>(null);
  const [rebalanceMetrics, setRebalanceMetrics] = useState<RebalanceMetrics | null>(null);
  const [rebalanceTasks, setRebalanceTasks] = useState<{
    active: RebalanceTaskItem[];
    queued: RebalanceTaskItem[];
    completed: RebalanceTaskItem[];
    failed: RebalanceTaskItem[];
  }>({ active: [], queued: [], completed: [], failed: [] });
  const [repairs, setRepairs] = useState<RepairTaskItem[]>([]);
  const [partitions, setPartitions] = useState<NetworkPartition[]>([]);

  const isGithubPages = typeof window !== 'undefined' && window.location.hostname.includes('github.io');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    if (isGithubPages) {
      setMockMode(true);
      return true;
    }
    return getMockMode();
  });
  const [isLive, setIsLive] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  // Compute cluster status dynamically from real backend data
  const computeClusterStatus = (): 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE' | 'OFFLINE' => {
    if (!isLive) return 'OFFLINE';
    if (nodes.length === 0) return 'UNAVAILABLE';

    const onlineNodes = nodes.filter(n => n.status === 'ONLINE').length;
    const writeQuorum = policy?.writeQuorum || 2;
    if (onlineNodes < writeQuorum) return 'UNAVAILABLE';

    // Check object statuses
    const hasUnavailable = objects.some(o => o.status === 'UNAVAILABLE');
    if (hasUnavailable) return 'UNAVAILABLE';

    const hasDegraded = objects.some(o => o.status === 'DEGRADED');
    const hasOfflineNodes = onlineNodes < nodes.length;
    const hasPartitions = partitions.length > 0;
    const hasActiveRepairs = repairs.some(r => r.status === 'PENDING' || r.status === 'REPAIRING');

    if (hasDegraded || hasOfflineNodes || hasPartitions || hasActiveRepairs) {
      return 'DEGRADED';
    }

    return 'HEALTHY';
  };

  const refreshData = useCallback(async (silent: boolean = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const [
        nodesData,
        objectsData,
        eventsData,
        policyData,
        storageData,
        recoveryData,
        rebalanceMetricsData,
        rebalanceTasksData,
        repairsData,
        partitionsData
      ] = await Promise.all([
        apiService.getNodes().catch(() => []),
        apiService.getObjects().catch(() => []),
        apiService.getEvents().catch(() => []),
        apiService.getPolicy().catch(() => null),
        apiService.getStorageMetrics().catch(() => null),
        apiService.getRecoveryMetrics().catch(() => null),
        apiService.getRebalanceMetrics().catch(() => null),
        apiService.getRebalanceTasks().catch(() => ({ active: [], queued: [], completed: [], failed: [] })),
        apiService.getRepairs().catch(() => []),
        apiService.getNetwork().catch(() => [])
      ]);

      setNodes(nodesData);
      setObjects(objectsData);
      setEvents(eventsData);
      setPolicy(policyData);
      setStorageMetrics(storageData);
      setRecoveryMetrics(recoveryData);
      setRebalanceMetrics(rebalanceMetricsData);
      setRebalanceTasks(rebalanceTasksData);
      setRepairs(repairsData);
      setPartitions(partitionsData);

      setIsLive(true);
      setBackendError(null);
    } catch (err: any) {
      setIsLive(false);
      setBackendError(err.message || 'Unable to reach the storage controller.');
    } finally {
      setInitialLoading(false);
      if (!silent) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refreshData(false);
    // Background polling: 3.5 seconds
    const interval = setInterval(() => {
      refreshData(true);
    }, 3500);
    return () => clearInterval(interval);
  }, [refreshData]);

  const handleRunIntegrityScan = async () => {
    setIsScanning(true);
    try {
      await apiService.scanIntegrity();
      await refreshData(true);
    } catch (err: any) {
      console.error('Integrity scan failed:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const clusterStatus = computeClusterStatus();
  const onlineNodeCount = nodes.filter(n => n.status === 'ONLINE').length;
  const activeRepairsCount = repairs.filter(r => r.status === 'PENDING' || r.status === 'REPAIRING').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Top Header */}
      <Header
        clusterStatus={clusterStatus}
        isLive={isLive}
        onlineNodeCount={onlineNodeCount}
        totalNodeCount={nodes.length}
        activeRepairsCount={activeRepairsCount}
        onRefresh={() => refreshData(false)}
        isRefreshing={isRefreshing}
      />

      {/* Main Layout Container */}
      <div style={{ display: 'flex', flex: 1, minHeight: 'calc(100vh - var(--header-height))' }}>
        {/* Left Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          activeRepairsCount={activeRepairsCount}
          partitionCount={partitions.length}
          rebalanceCount={rebalanceTasks.active.length}
        />

        {/* Content Canvas */}
        <main style={{
          flex: 1,
          padding: '28px 32px',
          overflowY: 'auto',
          maxWidth: '1600px',
          margin: '0 auto',
          width: '100%'
        }}>
          {backendError && (
            <div style={{ marginBottom: '20px' }}>
              <ErrorState
                title="Vault Controller Unavailable"
                message="Failed to connect to backend at http://localhost:3001/api. Ensure the Vault server is running locally, or launch interactive in-browser simulation mode."
                onRetry={() => refreshData(false)}
              />
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px', justifyContent: 'center' }}>
                <button
                  onClick={() => {
                    setMockMode(true);
                    setIsDemoMode(true);
                    setBackendError(null);
                    refreshData(false);
                  }}
                  style={{
                    background: '#11151A',
                    border: '1px solid #35C98B',
                    color: '#35C98B',
                    padding: '8px 18px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 500
                  }}
                >
                  ▶ Launch Interactive In-Browser Demo Mode
                </button>
              </div>
            </div>
          )}

          {isDemoMode && !backendError && (
            <div style={{
              background: 'rgba(110, 168, 254, 0.08)',
              border: '1px solid #252B33',
              borderRadius: '6px',
              padding: '10px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '13px',
              color: '#8D98A5'
            }}>
              <span>
                <strong style={{ color: '#6EA8FE' }}>Interactive Demo Mode:</strong> Running with simulated storage cluster in browser memory.
              </span>
              <button
                onClick={() => {
                  setMockMode(false);
                  setIsDemoMode(false);
                  refreshData(false);
                }}
                style={{
                  background: 'transparent',
                  border: '1px solid #374151',
                  color: '#E7EBEF',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Connect to Local Server
              </button>
            </div>
          )}

          {initialLoading ? (
            <LoadingState message="Connecting to Vault Storage Controller..." />
          ) : (
            <>
              {currentTab === 'overview' && (
                <OverviewView
                  clusterStatus={clusterStatus}
                  nodes={nodes}
                  objects={objects}
                  policy={policy}
                  storageMetrics={storageMetrics}
                  recoveryMetrics={recoveryMetrics}
                  partitions={partitions}
                  recentEvents={events}
                  onSelectTab={setCurrentTab}
                  onSelectNode={() => setCurrentTab('nodes')}
                />
              )}

              {currentTab === 'storage' && (
                <StorageVisualization
                  metrics={storageMetrics}
                  nodes={nodes}
                />
              )}

              {currentTab === 'objects' && (
                <ObjectBrowser
                  objects={objects}
                  policy={policy}
                  onRefresh={() => refreshData(true)}
                  onRunIntegrityScan={handleRunIntegrityScan}
                  isScanning={isScanning}
                />
              )}

              {currentTab === 'nodes' && (
                <NodesView
                  nodes={nodes}
                  partitions={partitions}
                  onRefresh={() => refreshData(true)}
                />
              )}

              {currentTab === 'replication' && (
                <ReplicationView
                  objects={objects}
                  nodes={nodes}
                  policy={policy}
                />
              )}

              {currentTab === 'repairs' && (
                <RepairsView
                  metrics={recoveryMetrics}
                  repairs={repairs}
                  onTriggerIntegrityScan={handleRunIntegrityScan}
                  isScanning={isScanning}
                />
              )}

              {currentTab === 'network' && (
                <NetworkMatrix
                  nodes={nodes}
                  partitions={partitions}
                  onRefresh={() => refreshData(true)}
                />
              )}

              {currentTab === 'rebalance' && (
                <RebalanceView
                  metrics={rebalanceMetrics}
                  tasks={rebalanceTasks}
                  onRefresh={() => refreshData(true)}
                />
              )}

              {currentTab === 'events' && (
                <EventsStream
                  events={events}
                />
              )}

              {currentTab === 'settings' && (
                <SettingsView
                  policy={policy}
                  nodes={nodes}
                  onRefresh={() => refreshData(true)}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
