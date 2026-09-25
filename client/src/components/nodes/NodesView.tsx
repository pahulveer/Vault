import React, { useState } from 'react';
import type { StorageNode, NetworkPartition } from '../../types';
import { Badge } from '../common/Badge';
import { formatBytes, formatRelativeTime } from '../../utils/formatters';
import { apiService } from '../../services/api';
import { AddNodeModal } from './AddNodeModal';

interface NodesViewProps {
  nodes: StorageNode[];
  partitions: NetworkPartition[];
  onRefresh: () => void;
}

export const NodesView: React.FC<NodesViewProps> = ({
  nodes,
  partitions,
  onRefresh
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [operatingNode, setOperatingNode] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const getPartitionsForNode = (nodeId: string): string[] => {
    const list: string[] = [];
    partitions.forEach(p => {
      if (p.nodeA === nodeId) list.push(p.nodeB);
      else if (p.nodeB === nodeId) list.push(p.nodeA);
    });
    return list;
  };

  const handleFailNode = async (nodeId: string) => {
    setOperatingNode(nodeId);
    setActionError(null);
    try {
      await apiService.failNode(nodeId);
      onRefresh();
    } catch (err: any) {
      setActionError(`Failed to mark node ${nodeId} offline: ${err.message}`);
    } finally {
      setOperatingNode(null);
    }
  };

  const handleRecoverNode = async (nodeId: string) => {
    setOperatingNode(nodeId);
    setActionError(null);
    try {
      await apiService.recoverNode(nodeId);
      onRefresh();
    } catch (err: any) {
      setActionError(`Failed to recover node ${nodeId}: ${err.message}`);
    } finally {
      setOperatingNode(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Storage Nodes ({nodes.length} registered)
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
            Simulated local filesystem partitions with independent failure simulation and recovery loops
          </p>
        </div>

        <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
          + Add Node
        </button>
      </div>

      {actionError && (
        <div className="banner banner-error">
          <span>{actionError}</span>
        </div>
      )}

      {/* Node Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '16px'
      }}>
        {nodes.map(node => {
          const nodePartitions = getPartitionsForNode(node.nodeId);
          const isPartitioned = nodePartitions.length > 0;
          const isOffline = node.status === 'OFFLINE';
          const isRecovering = node.status === 'RECOVERING';
          const isOperating = operatingNode === node.nodeId;
          const usedPct = (node.usedSpace / node.capacity) * 100;

          return (
            <div
              key={node.nodeId}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '16px',
                borderColor: isPartitioned 
                  ? 'var(--color-warning-border)' 
                  : isOffline 
                  ? 'var(--color-error-border)' 
                  : 'var(--border)'
              }}
            >
              <div>
                {/* Node Title & Status Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="mono" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {node.nodeId}
                    </span>
                    {node.nodeId === 'node-01' && (
                      <span style={{ fontSize: '10px', background: 'var(--surface-elevated)', border: '1px solid var(--border)', padding: '1px 5px', borderRadius: '3px', color: 'var(--text-muted)' }}>
                        Primary
                      </span>
                    )}
                  </div>
                  <Badge status={node.status} size="md" />
                </div>

                {/* Partition Notice (distinct from offline status) */}
                {isPartitioned && (
                  <div style={{
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--color-warning-bg)',
                    border: '1px solid var(--color-warning-border)',
                    fontSize: '11px',
                    color: 'var(--color-warning)',
                    marginBottom: '10px'
                  }}>
                    ⚡ Partitioned from {nodePartitions.join(', ')}
                  </div>
                )}

                {/* Telemetry info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Heartbeat:</span>
                    <span className="mono" style={{ color: isOffline ? 'var(--color-error)' : 'var(--text-secondary)' }}>
                      {isOffline ? 'OFFLINE (stalled)' : formatRelativeTime(node.lastHeartbeat)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Replicas Stored:</span>
                    <span className="mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {node.replicaCount} replicas ({node.objectCount} objects)
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Used Space:</span>
                    <span className="mono" style={{ color: 'var(--text-primary)' }}>
                      {formatBytes(node.usedSpace)} / {formatBytes(node.capacity)}
                    </span>
                  </div>

                  {/* Utilization bar */}
                  <div className="progress-bar-container" style={{ margin: '4px 0' }}>
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${Math.min(100, usedPct)}%` }}
                    />
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span className="mono">{node.storagePath}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons for Failure Simulation & Recovery */}
              <div style={{
                display: 'flex',
                gap: '8px',
                paddingTop: '12px',
                borderTop: '1px solid var(--border)'
              }}>
                <button
                  onClick={() => handleFailNode(node.nodeId)}
                  disabled={isOffline || isOperating}
                  className="btn btn-danger"
                  style={{ flex: 1 }}
                  title="Simulate node crash (node heartbeats stop, replicas marked MISSING)"
                >
                  {isOperating ? '...' : 'Fail Node'}
                </button>

                <button
                  onClick={() => handleRecoverNode(node.nodeId)}
                  disabled={!isOffline || isRecovering || isOperating}
                  className="btn btn-success"
                  style={{ flex: 1 }}
                  title="Recover node (transitions through RECOVERING and verifies replica checksums)"
                >
                  {isOperating ? '...' : 'Recover Node'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showAddModal && (
        <AddNodeModal
          existingNodeIds={nodes.map(n => n.nodeId)}
          onClose={() => setShowAddModal(false)}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
};
