import React, { useState, useEffect } from 'react';
import type { ReplicationPolicy, StorageNode } from '../../types';
import { apiService } from '../../services/api';

interface SettingsViewProps {
  policy: ReplicationPolicy | null;
  nodes: StorageNode[];
  onRefresh: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  policy,
  nodes,
  onRefresh
}) => {
  const [rf, setRf] = useState<number>(policy?.replicationFactor || 3);
  const [wq, setWq] = useState<number>(policy?.writeQuorum || 2);
  const [rq, setRq] = useState<number>(policy?.readQuorum || 2);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (policy) {
      setRf(policy.replicationFactor);
      setWq(policy.writeQuorum);
      setRq(policy.readQuorum);
    }
  }, [policy]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const res = await apiService.updatePolicy({
        replicationFactor: Number(rf),
        writeQuorum: Number(wq),
        readQuorum: Number(rq)
      });
      setFeedback({ type: 'success', message: res.message || 'Policy updated successfully.' });
      onRefresh();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Unable to update policy: ${err.message}`
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '780px' }}>
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Settings & Replication Policy
        </h2>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Configure cluster quorum thresholds, durability guarantees, and review system architecture.
        </div>
      </div>

      {/* Replication Policy Form */}
      <div className="card" style={{ padding: '20px' }}>
        <div className="card-title">
          <span>Replication Policy</span>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Available Nodes: {nodes.length}
          </span>
        </div>

        {feedback && (
          <div className={`banner banner-${feedback.type}`} style={{ marginBottom: '16px' }}>
            <span>{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Replication Factor
            </label>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Number of copies Vault maintains across distinct storage nodes.
            </div>
            <input
              type="number"
              className="input mono"
              min={1}
              max={nodes.length}
              value={rf}
              onChange={(e) => setRf(Number(e.target.value))}
              style={{ width: '120px' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Write Quorum
            </label>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Minimum successful replicas required for a write to be acknowledged.
            </div>
            <input
              type="number"
              className="input mono"
              min={1}
              max={rf}
              value={wq}
              onChange={(e) => setWq(Number(e.target.value))}
              style={{ width: '120px' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Read Quorum
            </label>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Minimum replica availability required for a verified read.
            </div>
            <input
              type="number"
              className="input mono"
              min={1}
              max={rf}
              value={rq}
              onChange={(e) => setRq(Number(e.target.value))}
              style={{ width: '120px' }}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '8px' }}>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
              style={{ padding: '8px 18px', fontSize: '13px' }}
            >
              {saving ? 'Applying...' : 'Save Policy'}
            </button>
          </div>
        </form>
      </div>

      {/* System Architecture Section */}
      <div className="card" style={{ padding: '20px' }}>
        <div className="card-title">
          <span>System Architecture</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Internal Layer Decomposition
          </span>
        </div>

        <div style={{
          backgroundColor: 'var(--surface-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '16px',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          color: 'var(--text-primary)',
          lineHeight: '1.6',
          whiteSpace: 'pre',
          overflowX: 'auto'
        }}>
{`                CLIENT REQUEST
                      │
                      ▼
             VAULT API / GATEWAY
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
   METADATA       PLACEMENT      POLICY
        │             │
        └──────┬──────┘
               │
       ┌───────┼───────┬───────┐
       ▼       ▼       ▼       ▼
    NODE-01 NODE-02 NODE-03 NODE-04 ... NODE-05
       │       │       │       │
       └───────┼───────┴───────┘
               │
      ┌────────┴────────┐
      ▼                 ▼
   REPAIR           REBALANCE
   WORKER             ENGINE
      │
      ▼
 INTEGRITY / SHA-256`}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '16px', fontSize: '12px' }}>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Metadata Manager</div>
            <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
              Maintains atomic JSON metadata records with object versions, checksums, and replica status.
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Placement Engine</div>
            <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
              Determines deterministic primary and secondary replica targets across active online storage nodes.
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Self-Healing Repair</div>
            <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
              Monitors node heartbeats and schedules prioritized replica reconstruction when degraded.
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Rebalance Engine</div>
            <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
              Re-distributes replicas upon node addition, verifying destination integrity before pruning.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
