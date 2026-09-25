import React, { useState } from 'react';
import type {
  StorageNode,
  ObjectMetadata,
  ReplicationPolicy,
  StorageMetrics,
  RecoveryMetrics,
  NetworkPartition,
  SystemEvent
} from '../../types';
import { Badge } from '../common/Badge';
import { formatBytes, formatRelativeTime, formatEventSummary } from '../../utils/formatters';

interface OverviewViewProps {
  clusterStatus: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE' | 'OFFLINE';
  nodes: StorageNode[];
  objects: ObjectMetadata[];
  policy: ReplicationPolicy | null;
  storageMetrics: StorageMetrics | null;
  recoveryMetrics: RecoveryMetrics | null;
  partitions: NetworkPartition[];
  recentEvents: SystemEvent[];
  onSelectTab: (tab: any) => void;
  onSelectNode: (nodeId: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  clusterStatus,
  nodes,
  objects,
  policy,
  storageMetrics,
  recoveryMetrics,
  partitions,
  recentEvents,
  onSelectTab,
  onSelectNode
}) => {
  const [selectedEvent, setSelectedEvent] = useState<SystemEvent | null>(null);

  const onlineNodes = nodes.filter(n => n.status === 'ONLINE').length;
  const offlineNodes = nodes.filter(n => n.status === 'OFFLINE');
  const desiredRF = policy?.replicationFactor ?? 3;
  const activeRepairsCount = recoveryMetrics?.activeRepairs ?? 0;

  // Count healthy replicas and degraded objects
  let actualHealthyReplicas = 0;
  let degradedObjectsCount = 0;
  objects.forEach(obj => {
    const healthyReps = (obj.replicas || []).filter(r => r.status === 'HEALTHY').length;
    actualHealthyReplicas += healthyReps;
    if (healthyReps < desiredRF) {
      degradedObjectsCount++;
    }
  });

  const totalCapacity = storageMetrics?.totalCapacity || (100 * 1024 * 1024 * 1024);
  const usedCapacity = storageMetrics?.usedCapacity ?? storageMetrics?.physicalStorage ?? 0;
  const storagePercent = totalCapacity > 0 ? Math.min(100, Math.max(0.1, (usedCapacity / totalCapacity) * 100)) : 0;

  // Determine system status message
  let statusMessage = 'All systems operational';
  if (offlineNodes.length > 0) {
    statusMessage = `${offlineNodes.map(n => n.nodeId).join(', ')} offline — self-healing active`;
  } else if (partitions.length > 0) {
    statusMessage = `${partitions.length} network partition${partitions.length > 1 ? 's' : ''} active`;
  } else if (degradedObjectsCount > 0) {
    statusMessage = `${degradedObjectsCount} object${degradedObjectsCount > 1 ? 's' : ''} recovering replicas`;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* LEVEL 1 — Immediate Status Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '18px 24px',
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '0.8px', color: 'var(--text-primary)' }}>
                VAULT
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Distributed Object Storage
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
              <Badge status={clusterStatus} size="md" />
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {statusMessage}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ textAlign: 'right' }}>
            <div className="mono" style={{ fontSize: '15px', fontWeight: 700, color: onlineNodes < nodes.length ? 'var(--color-warning)' : 'var(--color-success)' }}>
              {onlineNodes} / {nodes.length} Nodes Online
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {activeRepairsCount > 0 ? `${activeRepairsCount} Active Repairs` : 'No Active Repairs'}
            </div>
          </div>
        </div>
      </div>

      {/* LEVEL 2 — Four Primary Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px'
      }}>
        {/* Metric 1: Nodes */}
        <div 
          className="card"
          onClick={() => onSelectTab('nodes')}
          style={{ cursor: 'pointer', padding: '16px 20px', transition: 'border-color 150ms ease' }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-focus)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Nodes
          </div>
          <div className="mono" style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
            {onlineNodes} / {nodes.length}
          </div>
          <div style={{ fontSize: '12px', color: onlineNodes < nodes.length ? 'var(--color-warning)' : 'var(--color-success)', marginTop: '4px' }}>
            {onlineNodes === nodes.length ? 'All operational' : `${nodes.length - onlineNodes} node offline`}
          </div>
        </div>

        {/* Metric 2: Objects */}
        <div 
          className="card"
          onClick={() => onSelectTab('objects')}
          style={{ cursor: 'pointer', padding: '16px 20px', transition: 'border-color 150ms ease' }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-focus)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Objects
          </div>
          <div className="mono" style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
            {objects.length}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Stored objects
          </div>
        </div>

        {/* Metric 3: Replication */}
        <div 
          className="card"
          onClick={() => onSelectTab('replication')}
          style={{ cursor: 'pointer', padding: '16px 20px', transition: 'border-color 150ms ease' }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-focus)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Replication
          </div>
          <div className="mono" style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
            {desiredRF}×
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Protected copies
          </div>
        </div>

        {/* Metric 4: Repairs */}
        <div 
          className="card"
          onClick={() => onSelectTab('repairs')}
          style={{ cursor: 'pointer', padding: '16px 20px', transition: 'border-color 150ms ease' }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-focus)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Repairs
          </div>
          <div className="mono" style={{ fontSize: '28px', fontWeight: 700, color: activeRepairsCount > 0 ? 'var(--color-warning)' : 'var(--text-primary)', marginTop: '4px' }}>
            {activeRepairsCount}
          </div>
          <div style={{ fontSize: '12px', color: activeRepairsCount > 0 ? 'var(--color-warning)' : 'var(--text-secondary)', marginTop: '4px' }}>
            {activeRepairsCount > 0 ? `${activeRepairsCount} restoring availability` : 'No active repairs'}
          </div>
        </div>
      </div>

      {/* LEVEL 3 — CLUSTER STATUS (Storage Cluster) */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Storage Cluster
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {onlineNodes === nodes.length 
                ? 'All storage nodes operational' 
                : `${nodes.length - onlineNodes} node requires attention`}
            </div>
          </div>
          <button 
            onClick={() => onSelectTab('nodes')} 
            className="btn btn-secondary" 
            style={{ fontSize: '12px', padding: '4px 10px' }}
          >
            Manage Nodes →
          </button>
        </div>

        {/* 4 Clean Node Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px'
        }}>
          {nodes.map(node => {
            return (
              <div
                key={node.nodeId}
                onClick={() => {
                  onSelectNode(node.nodeId);
                  onSelectTab('nodes');
                }}
                style={{
                  backgroundColor: 'var(--surface-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  transition: 'border-color 150ms ease, background-color 150ms ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-focus)';
                  e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.backgroundColor = 'var(--surface-elevated)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="mono" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {node.nodeId}
                  </span>
                  <Badge status={node.status} label={node.status} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px', marginTop: '4px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Storage: </span>
                    <span className="mono" style={{ color: 'var(--text-secondary)' }}>
                      {formatBytes(node.usedSpace || 0)}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Replicas: </span>
                    <span className="mono" style={{ color: 'var(--text-secondary)' }}>
                      {node.replicaCount ?? node.objectCount ?? 0}
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '6px', marginTop: '2px' }}>
                  Heartbeat: {formatRelativeTime(node.lastHeartbeat)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* LEVEL 4 — Core Storage, Protection, Attention & Activity */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(320px, 1fr) minmax(360px, 1.2fr)',
        gap: '16px',
        alignItems: 'start'
      }}>
        {/* Left Column: Attention + Storage + Data Protection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Contextual Status: WHAT NEEDS ATTENTION */}
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
              {offlineNodes.length > 0 || partitions.length > 0 ? 'Action Required' : 'System Status'}
            </div>

            {offlineNodes.length === 0 && partitions.length === 0 && degradedObjectsCount === 0 ? (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{ color: 'var(--color-success)', fontSize: '16px', lineHeight: '20px' }}>✓</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Everything is operating normally.
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    All {nodes.length} storage nodes are online and replicas are fully verified.
                  </div>
                </div>
              </div>
            ) : null}

            {offlineNodes.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: '6px' }}>
                <span style={{ color: 'var(--color-warning)', fontSize: '16px', lineHeight: '20px' }}>⚠</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-warning)' }}>
                    {offlineNodes.map(n => n.nodeId).join(', ')} is offline
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {activeRepairsCount > 0 
                      ? `${activeRepairsCount} replica repair${activeRepairsCount > 1 ? 's' : ''} in progress to restore target redundancy.` 
                      : 'Self-healing engine monitoring node state.'}
                  </div>
                  <button 
                    onClick={() => onSelectTab('repairs')} 
                    style={{ background: 'none', border: 'none', color: 'var(--color-info)', fontSize: '12px', cursor: 'pointer', padding: 0, marginTop: '6px' }}
                  >
                    View repairs →
                  </button>
                </div>
              </div>
            )}

            {partitions.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: '8px' }}>
                <span style={{ color: 'var(--color-warning)', fontSize: '16px', lineHeight: '20px' }}>⚡</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-warning)' }}>
                    Network partition active
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {partitions.map(p => `${p.nodeA} cannot communicate with ${p.nodeB}`).join('; ')}.
                  </div>
                  <button 
                    onClick={() => onSelectTab('network')} 
                    style={{ background: 'none', border: 'none', color: 'var(--color-info)', fontSize: '12px', cursor: 'pointer', padding: 0, marginTop: '6px' }}
                  >
                    View network →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Storage Card */}
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Storage
              </span>
              <button 
                onClick={() => onSelectTab('objects')} 
                style={{ background: 'none', border: 'none', color: 'var(--color-info)', fontSize: '12px', cursor: 'pointer', padding: 0 }}
              >
                Browse objects →
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
              <span className="mono" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {formatBytes(usedCapacity)} used
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                of {formatBytes(totalCapacity, 0)}
              </span>
            </div>

            {/* Horizontal capacity bar */}
            <div className="progress-bar-container" style={{ height: '6px', marginBottom: '12px' }}>
              <div 
                className="progress-bar-fill" 
                style={{ width: `${Math.max(1, storagePercent)}%` }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
              <div>
                <div style={{ color: 'var(--text-muted)' }}>Logical data</div>
                <div className="mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {formatBytes(storageMetrics?.logicalStorage ?? 0)}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)' }}>Physical data</div>
                <div className="mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {formatBytes(storageMetrics?.physicalStorage ?? usedCapacity)}
                </div>
              </div>
            </div>

            {storageMetrics?.replicationOverhead && (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                Replication storage ratio: <span className="mono" style={{ color: 'var(--text-secondary)' }}>{storageMetrics.replicationOverhead.toFixed(2)}x</span>
              </div>
            )}
          </div>

          {/* Data Protection Card */}
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' }}>
              Data Protection
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Replication policy</span>
                <span className="mono" style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                  {desiredRF}× replication (Healthy)
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Integrity verification</span>
                <span className="mono" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  SHA-256 Checksums
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Pending repairs</span>
                <span className="mono" style={{ color: degradedObjectsCount > 0 ? 'var(--color-warning)' : 'var(--text-primary)', fontWeight: 600 }}>
                  {degradedObjectsCount} objects requiring repair
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Write quorum</span>
                <span className="mono" style={{ color: 'var(--text-primary)' }}>
                  {policy?.writeQuorum ?? 2} of {desiredRF} replicas
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activity */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Recent Activity
            </div>
            <button 
              onClick={() => onSelectTab('events')} 
              className="btn btn-secondary" 
              style={{ fontSize: '12px', padding: '3px 8px' }}
            >
              View all events →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentEvents.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No recent activity recorded.
              </div>
            ) : (
              recentEvents.slice(0, 6).map(evt => {
                const summary = formatEventSummary(evt);
                const isSelected = selectedEvent?.eventId === evt.eventId;

                return (
                  <div
                    key={evt.eventId}
                    onClick={() => setSelectedEvent(isSelected ? null : evt)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: isSelected ? 'var(--surface-hover)' : 'var(--surface-elevated)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      transition: 'background-color 150ms ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--surface-elevated)';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ 
                          fontSize: '12px', 
                          color: summary.badgeStatus === 'HEALTHY' 
                            ? 'var(--color-success)' 
                            : summary.badgeStatus === 'DEGRADED' 
                              ? 'var(--color-warning)' 
                              : 'var(--color-info)' 
                        }}>
                          {summary.icon}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {summary.title}
                        </span>
                      </div>
                      <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {formatRelativeTime(evt.timestamp)}
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', paddingLeft: '20px' }}>
                      {summary.subtitle}
                    </div>

                    {/* Expandable details */}
                    {isSelected && (
                      <div style={{
                        marginTop: '8px',
                        paddingTop: '8px',
                        borderTop: '1px solid var(--border)',
                        paddingLeft: '20px',
                        fontSize: '11px',
                        color: 'var(--text-muted)'
                      }}>
                        <div className="mono">ID: {evt.eventId}</div>
                        <div className="mono">RAW TYPE: {evt.type}</div>
                        {evt.objectId && <div className="mono">OBJECT: {evt.objectId}</div>}
                        {evt.nodeId && <div className="mono">NODE: {evt.nodeId}</div>}
                        <div>EXACT MESSAGE: {evt.message}</div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
