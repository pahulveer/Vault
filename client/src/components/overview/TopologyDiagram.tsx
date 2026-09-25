import React from 'react';
import type { StorageNode, NetworkPartition } from '../../types';
import { Badge } from '../common/Badge';
import { formatBytes, formatRelativeTime } from '../../utils/formatters';

interface TopologyDiagramProps {
  nodes: StorageNode[];
  partitions: NetworkPartition[];
  onSelectNode?: (nodeId: string) => void;
}

export const TopologyDiagram: React.FC<TopologyDiagramProps> = ({
  nodes,
  partitions,
  onSelectNode
}) => {
  // Compute partition count per node
  const getPartitionCount = (nodeId: string): number => {
    return partitions.filter(p => p.nodeA === nodeId || p.nodeB === nodeId).length;
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          Cluster Topology Map
        </span>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Coordinated 2D Node Tree
        </span>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px 0',
        position: 'relative'
      }}>
        {/* Gateway Root Node */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 2
        }}>
          <div style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-focus)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 24px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-success)',
              boxShadow: '0 0 6px rgba(53, 201, 139, 0.6)'
            }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', letterSpacing: '0.5px' }}>
                VAULT GATEWAY / COORDINATOR
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                node-01 (Primary) • Deterministic Hash Ring
              </div>
            </div>
          </div>

          {/* Central Trunk Line */}
          <div style={{
            width: '2px',
            height: '28px',
            background: 'var(--border)'
          }} />
        </div>

        {/* Storage Node Nodes Grid / Tree */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.max(1, Math.min(nodes.length, 5))}, minmax(180px, 1fr))`,
          gap: '16px',
          width: '100%',
          marginTop: '4px'
        }}>
          {nodes.map((node) => {
            const partitionCount = getPartitionCount(node.nodeId);
            const isPartitioned = partitionCount > 0;
            const isOnline = node.status === 'ONLINE';

            return (
              <div
                key={node.nodeId}
                onClick={() => onSelectNode?.(node.nodeId)}
                style={{
                  background: 'var(--surface-elevated)',
                  border: isPartitioned 
                    ? '1px solid var(--color-warning-border)' 
                    : isOnline 
                    ? '1px solid var(--border)' 
                    : '1px solid var(--color-error-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  cursor: onSelectNode ? 'pointer' : 'default',
                  transition: 'transform 150ms ease, border-color 150ms ease',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-info)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = isPartitioned 
                    ? 'var(--color-warning-border)' 
                    : isOnline 
                    ? 'var(--border)' 
                    : 'var(--color-error-border)';
                }}
              >
                {/* Node Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="mono" style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                    {node.nodeId}
                  </span>
                  <Badge status={node.status} />
                </div>

                {/* Partition Notice (distinct from offline) */}
                {isPartitioned && (
                  <div style={{
                    padding: '3px 6px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--color-warning-bg)',
                    border: '1px solid var(--color-warning-border)',
                    fontSize: '11px',
                    color: 'var(--color-warning)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span>⚡ Partitioned ({partitionCount})</span>
                  </div>
                )}

                {/* Node Telemetry */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Heartbeat:</span>
                    <span className="mono" style={{ color: 'var(--text-secondary)' }}>
                      {formatRelativeTime(node.lastHeartbeat)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Storage:</span>
                    <span className="mono" style={{ color: 'var(--text-primary)' }}>
                      {formatBytes(node.usedSpace)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Replicas:</span>
                    <span className="mono" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      {node.replicaCount}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Objects:</span>
                    <span className="mono" style={{ color: 'var(--text-primary)' }}>
                      {node.objectCount}
                    </span>
                  </div>
                </div>

                {/* Storage Utilization bar */}
                <div>
                  <div className="progress-bar-container" style={{ margin: '4px 0 0 0' }}>
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${Math.min(100, (node.usedSpace / node.capacity) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
