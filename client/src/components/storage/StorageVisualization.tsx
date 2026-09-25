import React from 'react';
import type { StorageMetrics, StorageNode } from '../../types';
import { formatBytes } from '../../utils/formatters';

interface StorageVisualizationProps {
  metrics: StorageMetrics | null;
  nodes: StorageNode[];
}

export const StorageVisualization: React.FC<StorageVisualizationProps> = ({ metrics, nodes }) => {
  if (!metrics) {
    return (
      <div className="card">
        <div style={{ color: 'var(--text-secondary)' }}>Loading storage metrics...</div>
      </div>
    );
  }

  const {
    logicalStorage,
    physicalStorage,
    replicationOverhead,
    totalCapacity,
    usedCapacity,
    availableCapacity,
    totalObjects
  } = metrics;

  const usedPct = totalCapacity > 0 ? (usedCapacity / totalCapacity) * 100 : 0;
  const overheadBytes = Math.max(0, physicalStorage - logicalStorage);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Primary Storage Metrics Card */}
      <div className="card">
        <div className="card-title">
          <span>Capacity & Utilization</span>
          <span className="mono" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {formatBytes(usedCapacity)} / {formatBytes(totalCapacity)} ({usedPct.toFixed(1)}%)
          </span>
        </div>

        {/* Clean Capacity Progress Bar */}
        <div style={{
          width: '100%',
          height: '16px',
          background: 'var(--surface-elevated)',
          borderRadius: 'var(--radius-sm)',
          overflow: 'hidden',
          display: 'flex',
          border: '1px solid var(--border)',
          margin: '12px 0 20px'
        }}>
          <div
            style={{
              width: `${Math.min(100, usedPct)}%`,
              backgroundColor: 'var(--color-info)',
              transition: 'width 300ms ease'
            }}
            title={`Used Space: ${formatBytes(usedCapacity)}`}
          />
        </div>

        {/* Capacity Breakdown Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          paddingTop: '12px',
          borderTop: '1px solid var(--border)'
        }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Logical Storage
            </div>
            <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
              {formatBytes(logicalStorage)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Raw data across {totalObjects} objects
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Physical Storage
            </div>
            <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
              {formatBytes(physicalStorage)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              All stored replica copies
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Replication Overhead
            </div>
            <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-info)', marginTop: '4px' }}>
              {replicationOverhead.toFixed(2)}x
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              +{formatBytes(overheadBytes)} redundancy
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Available Capacity
            </div>
            <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-success)', marginTop: '4px' }}>
              {formatBytes(availableCapacity)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Free space on online nodes
            </div>
          </div>
        </div>
      </div>

      {/* Per-Node Breakdown Table */}
      <div className="card">
        <div className="card-title">
          <span>Per-Node Storage Breakdown</span>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {nodes.length} registered storage targets
          </span>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Node ID</th>
                <th>Status</th>
                <th>Replicas</th>
                <th>Used Space</th>
                <th>Capacity</th>
                <th>Utilization</th>
              </tr>
            </thead>
            <tbody>
              {nodes.map(node => {
                const nodePct = (node.usedSpace / node.capacity) * 100;
                return (
                  <tr key={node.nodeId}>
                    <td className="mono" style={{ fontWeight: 600 }}>{node.nodeId}</td>
                    <td>
                      <span className={`badge badge-${node.status.toLowerCase()}`}>
                        <span className="badge-dot" />
                        {node.status}
                      </span>
                    </td>
                    <td className="mono">{node.replicaCount}</td>
                    <td className="mono">{formatBytes(node.usedSpace)}</td>
                    <td className="mono">{formatBytes(node.capacity)}</td>
                    <td style={{ minWidth: '160px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="progress-bar-container" style={{ margin: 0, flex: 1 }}>
                          <div 
                            className="progress-bar-fill" 
                            style={{ width: `${Math.min(100, nodePct)}%` }} 
                          />
                        </div>
                        <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)', width: '38px', textAlign: 'right' }}>
                          {nodePct.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
