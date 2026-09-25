import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  sublabel,
  badge,
  icon
}) => {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
          {label}
        </span>
        {icon && <span style={{ color: 'var(--text-muted)' }}>{icon}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
          {value}
        </span>
        {badge}
      </div>
      {sublabel && (
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {sublabel}
        </span>
      )}
    </div>
  );
};
