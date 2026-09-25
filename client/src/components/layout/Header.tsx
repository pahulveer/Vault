import React, { useState, useEffect } from 'react';
import { Badge } from '../common/Badge';

interface HeaderProps {
  clusterStatus: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE' | 'OFFLINE';
  isLive: boolean;
  onlineNodeCount: number;
  totalNodeCount: number;
  activeRepairsCount: number;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  clusterStatus,
  isLive,
  onlineNodeCount,
  totalNodeCount,
  activeRepairsCount,
  onRefresh,
  isRefreshing
}) => {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toISOString().substring(11, 19) + ' UTC');
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header style={{
      height: 'var(--header-height)',
      borderBottom: '1px solid var(--border)',
      background: 'var(--surface)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      {/* Brand & System */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-success)',
            fontWeight: 800,
            fontSize: '14px'
          }}>
            V
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.8px', color: 'var(--text-primary)', lineHeight: 1.1 }}>
              VAULT
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Distributed Storage Console
            </div>
          </div>
        </div>

        <div style={{ height: '24px', width: '1px', background: 'var(--border)' }} />

        {/* Cluster Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Cluster:</span>
          <Badge status={clusterStatus} label={clusterStatus} size="md" />
        </div>
      </div>

      {/* Cluster Quick Telemetry & Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <div>
            <span style={{ color: 'var(--text-muted)', marginRight: '4px' }}>Nodes:</span>
            <span className="mono" style={{ color: onlineNodeCount < totalNodeCount ? 'var(--color-warning)' : 'var(--text-primary)', fontWeight: 600 }}>
              {onlineNodeCount}/{totalNodeCount}
            </span>
          </div>

          <div>
            <span style={{ color: 'var(--text-muted)', marginRight: '4px' }}>Repairs:</span>
            <span className="mono" style={{ color: activeRepairsCount > 0 ? 'var(--color-warning)' : 'var(--text-primary)', fontWeight: 600 }}>
              {activeRepairsCount}
            </span>
          </div>
        </div>

        <div style={{ height: '20px', width: '1px', background: 'var(--border)' }} />

        {/* Live Indicator & Clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: 500,
            color: isLive ? 'var(--color-success)' : 'var(--color-error)'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isLive ? 'var(--color-success)' : 'var(--color-error)',
              boxShadow: isLive ? '0 0 6px rgba(53, 201, 139, 0.6)' : 'none'
            }} />
            <span>{isLive ? 'Live' : 'Disconnected'}</span>
          </div>

          <span className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {time}
          </span>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="btn btn-secondary"
            style={{ padding: '4px 8px', height: '28px', fontSize: '12px' }}
            title="Refresh cluster data"
          >
            {isRefreshing ? '↻' : '↻ Refresh'}
          </button>
        </div>
      </div>
    </header>
  );
};
