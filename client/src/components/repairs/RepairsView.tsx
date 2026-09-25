import React from 'react';
import type { RecoveryMetrics, RepairTaskItem } from '../../types';
import { Badge } from '../common/Badge';
import { MetricCard } from '../common/MetricCard';
import { EmptyState } from '../common/EmptyState';
import { CopyButton } from '../common/CopyButton';
import { formatBytes, formatRelativeTime, truncateId } from '../../utils/formatters';

interface RepairsViewProps {
  metrics: RecoveryMetrics | null;
  repairs: RepairTaskItem[];
  onTriggerIntegrityScan: () => void;
  isScanning: boolean;
}

export const RepairsView: React.FC<RepairsViewProps> = ({
  metrics,
  repairs,
  onTriggerIntegrityScan,
  isScanning
}) => {
  const activeCount = metrics?.activeRepairs ?? 0;
  const queuedCount = metrics?.queuedRepairs ?? 0;

  const formatPriority = (p: number | string) => {
    const num = Number(p);
    if (num === 2 || p === 'CRITICAL') return <Badge status="CRITICAL" label="CRITICAL" />;
    if (num === 1 || p === 'HIGH') return <Badge status="HIGH" label="HIGH" />;
    return <Badge status="NORMAL" label="NORMAL" />;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Plain-English Summary Banner */}
      <div style={{
        padding: '18px 22px',
        backgroundColor: activeCount > 0 ? 'var(--color-warning-bg)' : 'var(--surface)',
        border: `1px solid ${activeCount > 0 ? 'var(--color-warning-border)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {activeCount > 0 
              ? `${activeCount} repair${activeCount > 1 ? 's' : ''} in progress` 
              : 'No repairs required'}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {activeCount > 0 
              ? 'Vault is automatically restoring replica availability across online nodes.' 
              : 'All replicas across the cluster are currently healthy and verified.'}
          </div>
        </div>

        <button
          onClick={onTriggerIntegrityScan}
          disabled={isScanning}
          className="btn btn-secondary"
          style={{ fontSize: '12px' }}
        >
          {isScanning ? 'Scanning Cluster...' : 'Trigger Integrity Scan'}
        </button>
      </div>

      {/* Metrics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px'
      }}>
        <MetricCard
          label="Active Repairs"
          value={activeCount}
          badge={activeCount > 0 ? <Badge status="DEGRADED" label="ACTIVE" /> : <Badge status="HEALTHY" label="IDLE" />}
        />
        <MetricCard label="Queued" value={queuedCount} />
        <MetricCard label="Completed" value={metrics?.completedRepairs ?? 0} badge={<Badge status="HEALTHY" />} />
        <MetricCard label="Failed" value={metrics?.failedRepairs ?? 0} badge={(metrics?.failedRepairs ?? 0) > 0 ? <Badge status="FAILED" /> : undefined} />
        <MetricCard label="Objects Recovered" value={metrics?.objectsRecovered ?? 0} />
        <MetricCard label="Bytes Repaired" value={formatBytes(metrics?.bytesRepaired ?? 0)} />
        <MetricCard label="Avg Repair Time" value={`${Math.round(metrics?.averageRepairTimeMs ?? 0)} ms`} />
      </div>

      {/* Repair Queue & History Table */}
      <div className="card">
        <div className="card-title">
          <span>Self-Healing Repair Queue & Task Log</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Prioritized asynchronous replica reconstruction
          </span>
        </div>

        {repairs.length === 0 ? (
          <EmptyState
            title="No active repairs in queue"
            description="When a node failure or corruption is detected, self-healing tasks automatically appear here."
          />
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Repair ID</th>
                  <th>Object ID</th>
                  <th>Source</th>
                  <th>Destination</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {repairs.map(task => (
                  <tr key={task.taskId}>
                    <td className="mono" style={{ fontSize: '12px' }}>
                      <span title={task.taskId}>{truncateId(task.taskId, 8, 4)}</span>
                      <CopyButton text={task.taskId} label="" />
                    </td>
                    <td className="mono" style={{ fontSize: '12px' }}>
                      <span title={task.objectId}>{truncateId(task.objectId, 10, 6)}</span>
                      <CopyButton text={task.objectId} label="" />
                    </td>
                    <td className="mono" style={{ color: 'var(--text-secondary)' }}>
                      {task.sourceNodeId || 'Coordinator'}
                    </td>
                    <td className="mono" style={{ fontWeight: 600, color: 'var(--color-info)' }}>
                      {task.targetNodeId || 'Target Node'}
                    </td>
                    <td>{formatPriority(task.priority ?? 0)}</td>
                    <td><Badge status={task.status} label={task.status} /></td>
                    <td className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {task.createdAt ? formatRelativeTime(task.createdAt) : 'Just now'}
                    </td>
                    <td className="mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {task.durationMs !== undefined ? `${task.durationMs} ms` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
