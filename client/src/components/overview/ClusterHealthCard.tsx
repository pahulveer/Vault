import React from 'react';
import { Badge } from '../common/Badge';
import type { StorageNode, ObjectMetadata, ReplicationPolicy, NetworkPartition } from '../../types';

interface ClusterHealthCardProps {
  clusterStatus: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE' | 'OFFLINE';
  nodes: StorageNode[];
  objects: ObjectMetadata[];
  policy: ReplicationPolicy | null;
  activeRepairsCount: number;
  partitions: NetworkPartition[];
}

export const ClusterHealthCard: React.FC<ClusterHealthCardProps> = ({
  clusterStatus,
  nodes,
  objects,
  policy,
  activeRepairsCount,
  partitions
}) => {
  const onlineNodes = nodes.filter(n => n.status === 'ONLINE').length;
  const totalNodes = nodes.length;
  const desiredRF = policy?.replicationFactor || 3;

  // Calculate replication health
  let healthyObjectsCount = 0;
  let degradedObjectsCount = 0;
  let totalReplicasTarget = objects.length * desiredRF;
  let actualHealthyReplicas = 0;

  objects.forEach(obj => {
    const healthyReps = (obj.replicas || []).filter(r => r.status === 'HEALTHY').length;
    actualHealthyReplicas += healthyReps;
    if (healthyReps >= desiredRF) {
      healthyObjectsCount++;
    } else {
      degradedObjectsCount++;
    }
  });

  const repPercent = totalReplicasTarget > 0 
    ? Math.min(100, Math.round((actualHealthyReplicas / totalReplicasTarget) * 100))
    : 100;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          Cluster Health
        </span>
        <Badge status={clusterStatus} label={clusterStatus} size="md" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Node status line */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Storage Nodes</span>
          <span className="mono" style={{ fontSize: '13px', fontWeight: 600, color: onlineNodes < totalNodes ? 'var(--color-warning)' : 'var(--color-success)' }}>
            {onlineNodes} / {totalNodes} online
          </span>
        </div>

        {/* Replication health line */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Replication Consistency</span>
            <span className="mono" style={{ fontSize: '12px', color: repPercent === 100 ? 'var(--color-success)' : 'var(--color-warning)' }}>
              {repPercent}% ({actualHealthyReplicas}/{totalReplicasTarget})
            </span>
          </div>
          <div className="progress-bar-container">
            <div 
              className={`progress-bar-fill ${repPercent < 60 ? 'danger' : repPercent < 100 ? 'warning' : ''}`}
              style={{ width: `${repPercent}%` }}
            />
          </div>
          {degradedObjectsCount > 0 && (
            <span style={{ fontSize: '11px', color: 'var(--color-warning)' }}>
              ⚠ {degradedObjectsCount} object{degradedObjectsCount > 1 ? 's' : ''} below desired replication
            </span>
          )}
        </div>

        {/* Active Repairs status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Self-Healing Repairs</span>
          <span style={{ fontSize: '12px', color: activeRepairsCount > 0 ? 'var(--color-warning)' : 'var(--text-secondary)' }}>
            {activeRepairsCount > 0 ? `${activeRepairsCount} active tasks` : 'No active repairs'}
          </span>
        </div>

        {/* Partitions status */}
        {partitions.length > 0 && (
          <div style={{
            padding: '8px 10px',
            backgroundColor: 'var(--color-warning-bg)',
            border: '1px solid var(--color-warning-border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            color: 'var(--color-warning)'
          }}>
            ⚡ {partitions.length} network partition{partitions.length > 1 ? 's' : ''} active
          </div>
        )}
      </div>
    </div>
  );
};
