import React, { useState } from 'react';

interface CopyButtonProps {
  text: string;
  label?: string;
}

export const CopyButton: React.FC<CopyButtonProps> = ({ text, label }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="btn btn-secondary"
      style={{
        padding: '2px 6px',
        fontSize: '11px',
        height: '22px',
        borderRadius: '3px',
        color: copied ? 'var(--color-success)' : 'var(--text-secondary)'
      }}
      title="Copy to clipboard"
    >
      {copied ? '✓ Copied' : (label || 'Copy')}
    </button>
  );
};
