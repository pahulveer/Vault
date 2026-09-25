import React from 'react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'System Error',
  message,
  onRetry
}) => {
  return (
    <div style={{
      padding: '24px',
      border: '1px solid var(--color-error-border)',
      background: 'var(--color-error-bg)',
      borderRadius: 'var(--radius-md)',
      margin: '16px 0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px'
    }}>
      <div>
        <div style={{ fontWeight: 600, color: 'var(--color-error)', fontSize: '14px', marginBottom: '4px' }}>
          {title}
        </div>
        <div style={{ color: 'var(--text-primary)', fontSize: '13px' }}>
          {message}
        </div>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-secondary" style={{ borderColor: 'var(--color-error-border)' }}>
          Retry
        </button>
      )}
    </div>
  );
};
