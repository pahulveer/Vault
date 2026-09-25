import React, { useState } from 'react';
import type { RebalanceMetrics, RebalanceTaskItem } from '../../types';
import { Badge } from '../common/Badge';
import { MetricCard } from '../common/MetricCard';
import { EmptyState } from '../common/EmptyState';
import { CopyButton } from '../common/CopyButton';
import { formatBytes, truncateId } from '../../utils/formatters';
import { apiService } from '../../services/api';

interface RebalanceViewProps {
  metrics: RebalanceMetrics | null;
  tasks: {
    active: RebalanceTaskItem[];
    queued: RebalanceTaskItem[];
    completed: RebalanceTaskItem[];
    failed: RebalanceTaskItem[];
  };
  onRefresh: () => void;
}

export const RebalanceView: React.FC<RebalanceViewProps> = ({
  metrics,
  tasks,
  onRefresh
}) => {
  const [triggering, setTriggering] = useState(false);
  const [triggerStatus, setTriggerStatus] = useState<string | null>(null);

  const handleRunRebalance = async () => {
    setTriggering(true);
    setTriggerStatus('Scanning placement & scheduling movements...');
    try {
      await apiService.triggerRebalance();
      setTimeout(() => {
        setTriggerStatus('Rebalance scan dispatched.');
        onRefresh();
        setTriggering(false);
        setTimeout(() => setTriggerStatus(null), 3000);
      }, 800);
    } catch (err: any) {
      setTriggerStatus(`Failed to trigger rebalance: ${err.message}`);
      setTriggering(false);
    }
  };

  const allTasks = [
    ...tasks.active,
    ...tasks.queued,
    ...tasks.completed,
    ...tasks.failed
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header with Plain-English Explanation */}
      <div style={{
        padding: '18px 22px',
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Cluster Rebalancing
          </h2>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '750px', lineHeight: 1.5 }}>
            Vault redistributes replicas when storage nodes are added or cluster placement changes, verifying the destination before removing the old copy.
          </div>
        </div>

        <button
          onClick={handleRunRebalance}
          disabled={triggering}
          className="btn btn-primary"
          style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 600 }}
        >
          {triggering ? 'Rebalancing Cluster...' : 'Run Rebalance'}
        </button>
      </div>

      {triggerStatus && (
        <div className="banner banner-info" style={{ marginTop: '-8px' }}>
          <span>{triggerStatus}</span>
        </div>
      )}

      {/* Top Metrics Banner */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px'
      }}>
        <MetricCard
          label="Active Movements"
          value={metrics?.active ?? tasks.active.length}
          badge={(metrics?.active ?? 0) > 0 ? <Badge status="MOVING" label="REBALANCING" /> : <Badge status="HEALTHY" label="IDLE" />}
        />
        <MetricCard label="Queued" value={metrics?.queued ?? tasks.queued.length} />
        <MetricCard label="Completed" value={metrics?.completed ?? tasks.completed.length} badge={<Badge status="COMPLETED" />} />
        <MetricCard label="Failed" value={metrics?.failed ?? tasks.failed.length} badge={(metrics?.failed ?? 0) > 0 ? <Badge status="FAILED" /> : undefined} />
        <MetricCard label="Objects Rebalanced" value={metrics?.objectsRebalanced ?? tasks.completed.length} />
        <MetricCard label="Bytes Rebalanced" value={formatBytes(metrics?.bytesRebalanced ?? 0)} />
        <MetricCard label="Avg Transfer Time" value={`${Math.round(metrics?.averageTimeMs ?? 0)} ms`} />
      </div>

      {/* Task Queue Card */}
      <div className="card">
        <div className="card-title">
          <span>Rebalance Tasks Log</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Placement re-distribution history
          </span>
        </div>

        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
          When new storage nodes join or topology changes, Vault reconciles deterministic placement targets. Replicas are safely copied, verified via SHA-256 on the destination, and only then pruned from obsolete nodes.
        </p>

        {allTasks.length === 0 ? (
          <EmptyState
            title="Cluster placement balanced"
            description="All replicas currently reside on their optimal deterministic target nodes according to the placement hash ring."
            action={
              <button onClick={handleRunRebalance} className="btn btn-secondary">
                Trigger Placement Audit
              </button>
            }
          />
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Task ID</th>
                  <th>Object ID</th>
                  <th>Source</th>
                  <th>Destination</th>
                  <th>Status</th>
                  <th>Bytes</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {allTasks.map(task => (
                  <tr key={task.taskId}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="mono" style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                          {truncateId(task.taskId, 10, 6)}
                        </span>
                        <CopyButton text={task.taskId} />
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="mono" style={{ fontSize: '12px', color: 'var(--color-info)' }}>
                          {truncateId(task.objectId, 10, 6)}
                        </span>
                        <CopyButton text={task.objectId} />
                      </div>
                    </td>

                    <td className="mono" style={{ color: 'var(--text-secondary)' }}>
                      {task.sourceNodeId || 'auto'}
                    </td>

                    <td className="mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {task.targetNodeId || 'unknown'}
                    </td>

                    <td>
                      <Badge status={task.status} />
                    </td>

                    <td className="mono">
                      {task.bytesTransferred ? formatBytes(task.bytesTransferred) : '—'}
                    </td>

                    <td className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
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
