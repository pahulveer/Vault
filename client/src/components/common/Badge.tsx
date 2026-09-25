import React from 'react';

interface BadgeProps {
  status: string;
  label?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ status, label, size = 'sm' }) => {
  const norm = (status || 'UNKNOWN').toLowerCase();
  const displayLabel = label || status;

  return (
    <span className={`badge badge-${norm}`} style={{ fontSize: size === 'md' ? '12px' : '11px', padding: size === 'md' ? '4px 10px' : '2px 8px' }}>
      <span className="badge-dot" />
      {displayLabel}
    </span>
  );
};
