import React, { useState } from 'react';
import type { StorageNode, NetworkPartition } from '../../types';
import { apiService } from '../../services/api';
import { EmptyState } from '../common/EmptyState';

interface NetworkMatrixProps {
  nodes: StorageNode[];
  partitions: NetworkPartition[];
  onRefresh: () => void;
}

export const NetworkMatrix: React.FC<NetworkMatrixProps> = ({
  nodes,
  partitions,
  onRefresh
}) => {
  const [nodeA, setNodeA] = useState<string>(nodes[0]?.nodeId || '');
  const [nodeB, setNodeB] = useState<string>(nodes[1]?.nodeId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPartitioned = (a: string, b: string): boolean => {
    if (a === b) return false;
    return partitions.some(p => 
      (p.nodeA === a && p.nodeB === b) || (p.nodeA === b && p.nodeB === a)
    );
  };

  const handleCreatePartition = async () => {
    if (nodeA === nodeB) {
      setError('Cannot partition a node from itself');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiService.partitionNodes(nodeA, nodeB);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to partition nodes');
    } finally {
      setLoading(false);
    }
  };

  const handleHeal = async (a: string, b: string) => {
    setLoading(true);
    setError(null);
    try {
      await apiService.healPartition(a, b);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to heal partition');
    } finally {
      setLoading(false);
    }
  };

  const handleHealAll = async () => {
    setLoading(true);
    setError(null);
    try {
      for (const p of partitions) {
        await apiService.healPartition(p.nodeA, p.nodeB);
      }
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to heal all partitions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header with Judge-First Plain-English Explanation */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Network Connectivity & Partitions
        </h2>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '800px', lineHeight: 1.5 }}>
          This view shows which storage nodes can currently communicate. A partition means nodes are <strong>online</strong> but temporarily unable to reach each other over the network, simulating real-world distributed network splits.
        </div>
      </div>

      {/* Controls Card */}
      <div className="card">
        <div className="card-title">
          <span>Network Partition & Isolation Control</span>
          {partitions.length > 0 && (
            <button
              onClick={handleHealAll}
              disabled={loading}
              className="btn btn-secondary"
              style={{ fontSize: '12px' }}
            >
              Heal All Partitions ({partitions.length})
            </button>
          )}
        </div>

        {error && (
          <div className="banner banner-error" style={{ marginBottom: '16px' }}>
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Node A:</span>
            <select
              className="select mono"
              value={nodeA}
              onChange={(e) => setNodeA(e.target.value)}
            >
              {nodes.map(n => (
                <option key={n.nodeId} value={n.nodeId}>{n.nodeId}</option>
              ))}
            </select>
          </div>

          <span style={{ color: 'var(--text-muted)' }}>↔</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Node B:</span>
            <select
              className="select mono"
              value={nodeB}
              onChange={(e) => setNodeB(e.target.value)}
            >
              {nodes.map(n => (
                <option key={n.nodeId} value={n.nodeId}>{n.nodeId}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCreatePartition}
            disabled={loading || nodeA === nodeB || isPartitioned(nodeA, nodeB)}
            className="btn btn-danger"
          >
            Partition Link
          </button>

          <button
            onClick={() => handleHeal(nodeA, nodeB)}
            disabled={loading || nodeA === nodeB || !isPartitioned(nodeA, nodeB)}
            className="btn btn-success"
          >
            Heal Link
          </button>
        </div>

        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '10px' }}>
          * Network partitions drop communication between specified pairs. Partitioned nodes remain <strong>ONLINE</strong> and retain their physical storage.
        </div>
      </div>

      {/* Symmetric Connectivity Matrix */}
      <div className="card">
        <div className="card-title">
          <span>Symmetric Connectivity Matrix</span>
          <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <span style={{ color: 'var(--color-success)' }}>✓ Connected</span>
            <span style={{ color: 'var(--color-error)' }}>✕ Partitioned</span>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table" style={{ textAlign: 'center' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Node</th>
                {nodes.map(n => (
                  <th key={n.nodeId} className="mono" style={{ textAlign: 'center' }}>{n.nodeId}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {nodes.map(rowNode => (
                <tr key={rowNode.nodeId}>
                  <td className="mono" style={{ fontWeight: 600, textAlign: 'left' }}>
                    {rowNode.nodeId}
                  </td>
                  {nodes.map(colNode => {
                    const isSelf = rowNode.nodeId === colNode.nodeId;
                    const partitioned = isPartitioned(rowNode.nodeId, colNode.nodeId);

                    return (
                      <td key={colNode.nodeId} style={{ textAlign: 'center' }}>
                        {isSelf ? (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        ) : partitioned ? (
                          <span
                            onClick={() => handleHeal(rowNode.nodeId, colNode.nodeId)}
                            style={{
                              color: 'var(--color-error)',
                              fontWeight: 700,
                              cursor: 'pointer',
                              padding: '2px 6px',
                              borderRadius: '3px',
                              background: 'var(--color-error-bg)',
                              border: '1px solid var(--color-error-border)'
                            }}
                            title={`Click to heal ${rowNode.nodeId} ↔ ${colNode.nodeId}`}
                          >
                            ✕ Partitioned
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                            ✓
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Partitions Panel */}
      <div className="card">
        <div className="card-title">
          <span>Active Partition Links ({partitions.length})</span>
        </div>

        {partitions.length === 0 ? (
          <EmptyState
            title="No partitions"
            description="All nodes in the cluster can currently communicate over the mesh network."
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
            {partitions.map((p, idx) => (
              <div
                key={idx}
                style={{
                  border: '1px solid var(--color-error-border)',
                  background: 'var(--color-error-bg)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div className="mono" style={{ fontWeight: 700, color: 'var(--color-error)' }}>
                    {p.nodeA} ⚡ {p.nodeB}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Symmetric Isolation Active
                  </div>
                </div>

                <button
                  onClick={() => handleHeal(p.nodeA, p.nodeB)}
                  className="btn btn-secondary"
                  style={{ fontSize: '11px', padding: '3px 8px' }}
                >
                  Heal Link
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
