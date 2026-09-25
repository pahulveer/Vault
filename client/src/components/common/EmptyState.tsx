import React from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, action }) => {
  return (
    <div style={{
      textAlign: 'center',
      padding: '48px 24px',
      border: '1px dashed var(--border)',
      borderRadius: 'var(--radius-md)',
      background: 'rgba(23, 28, 34, 0.4)',
      margin: '12px 0'
    }}>
      <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
        {title}
      </div>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 16px' }}>
        {description}
      </p>
      {action}
    </div>
  );
};
