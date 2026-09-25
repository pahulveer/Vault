import React from 'react';
import type { ObjectMetadata, ReplicationPolicy, StorageNode } from '../../types';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { formatBytes, formatRelativeTime, truncateId } from '../../utils/formatters';

interface ReplicationViewProps {
  objects: ObjectMetadata[];
  nodes?: StorageNode[];
  policy: ReplicationPolicy | null;
}

export const ReplicationView: React.FC<ReplicationViewProps> = ({
  objects,
  policy
}) => {
  const desiredRF = policy?.replicationFactor || 3;
  const writeQuorum = policy?.writeQuorum || 2;
  const readQuorum = policy?.readQuorum || 2;
  const totalDesired = objects.length * desiredRF;

  let healthy = 0;
  let missing = 0;
  let corrupted = 0;
  let stale = 0;
  let repairing = 0;

  objects.forEach(obj => {
    (obj.replicas || []).forEach(rep => {
      const st = rep.status.toUpperCase();
      if (st === 'HEALTHY') healthy++;
      else if (st === 'MISSING' || st === 'FAILED') missing++;
      else if (st === 'CORRUPTED') corrupted++;
      else if (st === 'STALE') stale++;
      else if (st === 'REPAIRING') repairing++;
    });
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header explanation */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Replication & Quorum
        </h2>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Vault enforces quorum-based durability across storage nodes, ensuring verified replicas remain available during hardware failures.
        </div>
      </div>

      {/* Quorum & Policy Summary Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '12px'
      }}>
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Replication Factor
          </div>
          <div className="mono" style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
            {desiredRF}×
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Target copies / object
          </div>
        </div>

        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Write Quorum
          </div>
          <div className="mono" style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
            WQ = {writeQuorum}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Acks needed to succeed
          </div>
        </div>

        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Read Quorum
          </div>
          <div className="mono" style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
            RQ = {readQuorum}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Acks needed to read
          </div>
        </div>

        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Healthy Replicas
          </div>
          <div className="mono" style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-success)', marginTop: '4px' }}>
            {healthy}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {totalDesired > 0 ? `${totalDesired} target (${Math.round((healthy / totalDesired) * 100)}%)` : 'No objects'}
          </div>
        </div>

        {missing > 0 && (
          <div className="card" style={{ padding: '14px 16px', borderColor: 'var(--color-error)' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-error)', textTransform: 'uppercase' }}>
              Missing Replicas
            </div>
            <div className="mono" style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-error)', marginTop: '4px' }}>
              {missing}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Pending repair
            </div>
          </div>
        )}
      </div>

      {/* Visual Replica Tree Layout per Object */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Object Replica Distribution
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Hierarchical view of physical copy locations across nodes
            </div>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {objects.length} stored object{objects.length === 1 ? '' : 's'}
          </span>
        </div>

        {objects.length === 0 ? (
          <EmptyState
            title="No object replicas found"
            description="Upload objects to visualize their distributed replica layout across the cluster."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {objects.map(obj => {
              const reps = obj.replicas || [];
              const healthyCount = reps.filter(r => r.status === 'HEALTHY').length;

              return (
                <div
                  key={obj.objectId}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--surface-elevated)',
                    padding: '16px'
                  }}
                >
                  {/* Object Header line */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {obj.filename}
                      </span>
                      <span className="mono" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                        ({truncateId(obj.objectId, 10, 6)})
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {formatBytes(obj.size)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Badge status={obj.status} label={obj.status} />
                    </div>
                  </div>

                  {/* Plain English explanation */}
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', paddingLeft: '4px' }}>
                    This object currently has <strong style={{ color: healthyCount >= desiredRF ? 'var(--color-success)' : 'var(--color-warning)' }}>{healthyCount} healthy</strong> {healthyCount === 1 ? 'copy' : 'copies'} across {reps.length} target storage nodes.
                  </div>

                  {/* Clean Visual Replica Tree */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    paddingLeft: '12px',
                    borderLeft: '2px solid var(--border)'
                  }}>
                    {reps.map((rep, idx) => {
                      const isLast = idx === reps.length - 1;
                      return (
                        <div
                          key={rep.nodeId + idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--surface)',
                            border: '1px solid var(--border)',
                            fontSize: '12px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span className="mono" style={{ color: 'var(--text-muted)' }}>
                              {isLast ? '└──' : '├──'}
                            </span>
                            <span className="mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {rep.nodeId}
                            </span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                              v{rep.version}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            {rep.lastVerified && (
                              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                                Verified {formatRelativeTime(rep.lastVerified)}
                              </span>
                            )}
                            <Badge status={rep.status} label={rep.status} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
