import React from 'react';

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Loading system data...' }) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      padding: '40px 20px',
      color: 'var(--text-secondary)',
      fontSize: '13px'
    }}>
      <div style={{
        width: '16px',
        height: '16px',
        border: '2px solid var(--border)',
        borderTopColor: 'var(--color-info)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <span>{message}</span>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
