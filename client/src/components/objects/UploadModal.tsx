import React, { useState, useRef } from 'react';
import { apiService } from '../../services/api';
import type { ReplicationPolicy, ObjectMetadata } from '../../types';
import { Badge } from '../common/Badge';
import { CopyButton } from '../common/CopyButton';
import { formatBytes } from '../../utils/formatters';

interface UploadModalProps {
  policy: ReplicationPolicy | null;
  onClose: () => void;
  onSuccess: (metadata: ObjectMetadata) => void;
}

type UploadPhase = 'IDLE' | 'UPLOADING' | 'REPLICATING' | 'VERIFYING' | 'COMPLETED';

export const UploadModal: React.FC<UploadModalProps> = ({
  policy,
  onClose,
  onSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<UploadPhase>('IDLE');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ObjectMetadata | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setError(null);
    setPhase('UPLOADING');

    try {
      // Simulate real-time pipeline status feedback transitions
      setTimeout(() => setPhase('REPLICATING'), 300);
      setTimeout(() => setPhase('VERIFYING'), 600);

      const metadata = await apiService.uploadObject(file);
      setPhase('COMPLETED');
      setResult(metadata);
      onSuccess(metadata);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
      setPhase('IDLE');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <h3 style={{ margin: 0, fontSize: '16px' }}>Upload Object to Vault</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {error && (
          <div className="banner banner-error" style={{ marginBottom: '16px' }}>
            <span>{error}</span>
          </div>
        )}

        {phase === 'COMPLETED' && result ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              padding: '16px',
              backgroundColor: 'var(--color-success-bg)',
              border: '1px solid var(--color-success-border)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-success)', marginBottom: '4px' }}>
                ✓ Object Successfully Stored
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Replication quorum satisfied and verified
              </div>
            </div>

            <div style={{
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              fontSize: '13px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Object ID:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="mono" style={{ fontWeight: 600 }}>{result.objectId}</span>
                  <CopyButton text={result.objectId} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Filename:</span>
                <span>{result.filename}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Size:</span>
                <span className="mono">{formatBytes(result.size)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
                <Badge status={result.status} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Replicas:</span>
                <span className="mono">{result.replicas?.length || policy?.replicationFactor || 3}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Checksum:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="mono" style={{ fontSize: '11px', color: 'var(--color-info)' }}>
                    {result.checksum.substring(0, 16)}...
                  </span>
                  <CopyButton text={result.checksum} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button onClick={onClose} className="btn btn-primary">
                Done
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Drag & Drop Area */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragOver ? 'var(--color-info)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '36px 16px',
                textAlign: 'center',
                cursor: 'pointer',
                background: isDragOver ? 'var(--color-info-bg)' : 'var(--surface-elevated)',
                transition: 'all 150ms ease'
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              {file ? (
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {file.name}
                  </div>
                  <div className="mono" style={{ fontSize: '12px', color: 'var(--color-info)' }}>
                    {formatBytes(file.size)}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                    Click or drop to replace file
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Drop file here or click to browse
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Any file format up to local node disk limit
                  </div>
                </div>
              )}
            </div>

            {/* Current Policy Indicators */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '12px 14px',
              backgroundColor: 'var(--surface-elevated)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px'
            }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Replication Factor: </span>
                <span className="mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {policy?.replicationFactor ?? 3}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Write Quorum: </span>
                <span className="mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {policy?.writeQuorum ?? 2}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Read Quorum: </span>
                <span className="mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {policy?.readQuorum ?? 2}
                </span>
              </div>
            </div>

            {/* Upload Pipeline State Feedback */}
            {phase !== 'IDLE' && (
              <div style={{
                padding: '12px',
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  width: '14px',
                  height: '14px',
                  border: '2px solid var(--border)',
                  borderTopColor: 'var(--color-info)',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }} />
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>
                  {phase === 'UPLOADING' && 'Uploading binary data to coordinator...'}
                  {phase === 'REPLICATING' && 'Dispersing replicas across placement nodes...'}
                  {phase === 'VERIFYING' && 'Verifying SHA-256 replica integrity...'}
                </span>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={onClose} disabled={phase !== 'IDLE'} className="btn btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || phase !== 'IDLE'}
                className="btn btn-primary"
              >
                {phase === 'IDLE' ? 'Upload Object' : 'Processing...'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
