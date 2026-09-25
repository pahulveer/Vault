import React, { useState } from 'react';
import type { SystemEvent } from '../../types';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { truncateId } from '../../utils/formatters';

interface EventsStreamProps {
  events: SystemEvent[];
}

type EventCategory = 'ALL' | 'NODES' | 'REPLICATION' | 'REPAIR' | 'NETWORK' | 'REBALANCE' | 'INTEGRITY';

export const EventsStream: React.FC<EventsStreamProps> = ({ events }) => {
  const [filter, setFilter] = useState<EventCategory>('ALL');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const getCategory = (type: string): EventCategory => {
    const t = type.toUpperCase();
    if (t.includes('NODE')) return 'NODES';
    if (t.includes('REPLICA') || t.includes('OBJECT')) return 'REPLICATION';
    if (t.includes('REPAIR') || t.includes('RECOVER')) return 'REPAIR';
    if (t.includes('NETWORK') || t.includes('PARTITION') || t.includes('HEAL')) return 'NETWORK';
    if (t.includes('REBALANCE')) return 'REBALANCE';
    if (t.includes('INTEGRITY') || t.includes('CORRUPT') || t.includes('SCAN')) return 'INTEGRITY';
    return 'ALL';
  };

  const filteredEvents = events.filter(e => {
    if (filter === 'ALL') return true;
    return getCategory(e.type) === filter;
  });

  const getStatusVariant = (type: string) => {
    const t = type.toUpperCase();
    if (t.includes('FAILED') || t.includes('CORRUPTED') || t.includes('ERROR') || t.includes('MISSING')) return 'UNAVAILABLE';
    if (t.includes('DEGRADED') || t.includes('PARTITION') || t.includes('RECOVERING')) return 'DEGRADED';
    if (t.includes('REPAIRED') || t.includes('HEALED') || t.includes('COMPLETED') || t.includes('ONLINE') || t.includes('STORED')) return 'HEALTHY';
    return 'INFO';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Category Filter Pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {(['ALL', 'NODES', 'REPLICATION', 'REPAIR', 'NETWORK', 'REBALANCE', 'INTEGRITY'] as EventCategory[]).map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className="btn"
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: filter === cat ? 'var(--surface-elevated)' : 'transparent',
              color: filter === cat ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: filter === cat ? '1px solid var(--border-focus)' : '1px solid var(--border)'
            }}
          >
            {cat}
          </button>
        ))}
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
          Showing {filteredEvents.length} of {events.length} events
        </span>
      </div>

      {/* Events List */}
      <div className="card" style={{ padding: '8px 0' }}>
        {filteredEvents.length === 0 ? (
          <div style={{ padding: '24px' }}>
            <EmptyState
              title="No events in stream"
              description="No audit events matched the selected filter criteria."
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredEvents.map((evt) => {
              const isExpanded = expandedEventId === evt.eventId;
              const timeStr = new Date(evt.timestamp).toLocaleTimeString();
              const dateStr = new Date(evt.timestamp).toLocaleDateString();

              return (
                <div
                  key={evt.eventId}
                  style={{
                    padding: '12px 18px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    transition: 'background-color 150ms ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {timeStr}
                      </span>
                      <Badge status={getStatusVariant(evt.type)} label={evt.type} />
                      {evt.nodeId && (
                        <span className="mono" style={{ fontSize: '11px', background: 'var(--surface-elevated)', padding: '2px 6px', borderRadius: '3px', color: 'var(--text-secondary)' }}>
                          node: {evt.nodeId}
                        </span>
                      )}
                      {evt.objectId && (
                        <span className="mono" style={{ fontSize: '11px', background: 'var(--surface-elevated)', padding: '2px 6px', borderRadius: '3px', color: 'var(--color-info)' }}>
                          {truncateId(evt.objectId, 8, 4)}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => setExpandedEventId(isExpanded ? null : evt.eventId)}
                      className="btn btn-secondary"
                      style={{ padding: '2px 6px', fontSize: '11px', height: '22px' }}
                    >
                      {isExpanded ? 'Hide Payload' : 'View Payload'}
                    </button>
                  </div>

                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', paddingLeft: '4px' }}>
                    {evt.message}
                  </div>

                  {/* Expandable Technical Detail */}
                  {isExpanded && (
                    <div style={{
                      marginTop: '8px',
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 14px',
                      fontSize: '12px'
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '4px', marginBottom: '8px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Event ID:</span>
                        <span className="mono" style={{ color: 'var(--text-primary)' }}>{evt.eventId}</span>

                        <span style={{ color: 'var(--text-muted)' }}>Timestamp:</span>
                        <span className="mono" style={{ color: 'var(--text-primary)' }}>{evt.timestamp} ({dateStr})</span>

                        <span style={{ color: 'var(--text-muted)' }}>Type:</span>
                        <span className="mono" style={{ color: 'var(--text-primary)' }}>{evt.type}</span>

                        {evt.nodeId && (
                          <>
                            <span style={{ color: 'var(--text-muted)' }}>Node Target:</span>
                            <span className="mono" style={{ color: 'var(--text-primary)' }}>{evt.nodeId}</span>
                          </>
                        )}

                        {evt.objectId && (
                          <>
                            <span style={{ color: 'var(--text-muted)' }}>Object Target:</span>
                            <span className="mono" style={{ color: 'var(--text-primary)' }}>{evt.objectId}</span>
                          </>
                        )}
                      </div>

                      <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Raw Payload:</div>
                      <pre className="mono" style={{
                        marginTop: '4px',
                        padding: '6px',
                        background: 'var(--surface)',
                        borderRadius: '3px',
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                        overflowX: 'auto'
                      }}>
                        {JSON.stringify(evt, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
