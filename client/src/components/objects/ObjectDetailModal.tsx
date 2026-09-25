import React from 'react';
import type { ObjectMetadata } from '../../types';
import { Badge } from '../common/Badge';
import { CopyButton } from '../common/CopyButton';
import { formatBytes, formatRelativeTime, truncateChecksum } from '../../utils/formatters';
import { apiService } from '../../services/api';

interface ObjectDetailModalProps {
  object: ObjectMetadata | null;
  onClose: () => void;
}

export const ObjectDetailModal: React.FC<ObjectDetailModalProps> = ({ object, onClose }) => {
  if (!object) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
        <div className="modal-header">
          <div>
            <h3 style={{ margin: 0, fontSize: '16px' }}>Object Details</h3>
            <span className="mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {object.objectId}
            </span>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Primary Meta Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
          background: 'var(--surface-elevated)',
          padding: '14px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px'
        }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Filename</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
              {object.filename}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Size</div>
            <div className="mono" style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '2px' }}>
              {formatBytes(object.size)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Version</div>
            <div className="mono" style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '2px' }}>
              v{object.version}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Object Health</div>
            <div style={{ marginTop: '2px' }}>
              <Badge status={object.status} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Created At</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {new Date(object.createdAt).toLocaleString()}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Desired RF</div>
            <div className="mono" style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '2px' }}>
              {object.replicationFactor || 3} copies
            </div>
          </div>
        </div>

        {/* Checksum Bar */}
        <div style={{
          padding: '10px 14px',
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginRight: '8px' }}>
              SHA-256 Checksum:
            </span>
            <span className="mono" style={{ fontSize: '12px', color: 'var(--color-info)' }}>
              {object.checksum}
            </span>
          </div>
          <CopyButton text={object.checksum} />
        </div>

        {/* Replica Distribution Table */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Replica Distribution ({object.replicas?.length || 0} replicas recorded)
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Node</th>
                  <th>Status</th>
                  <th>Version</th>
                  <th>Size</th>
                  <th>Checksum</th>
                  <th>Last Verified</th>
                </tr>
              </thead>
              <tbody>
                {(object.replicas || []).map((rep) => (
                  <tr key={rep.nodeId}>
                    <td className="mono" style={{ fontWeight: 600 }}>{rep.nodeId}</td>
                    <td>
                      <Badge status={rep.status} />
                    </td>
                    <td className="mono">v{rep.version || object.version}</td>
                    <td className="mono">{formatBytes(rep.size || object.size)}</td>
                    <td className="mono" style={{ fontSize: '11px' }}>
                      <span title={rep.checksum || object.checksum}>
                        {truncateChecksum(rep.checksum || object.checksum)}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {rep.lastVerified ? formatRelativeTime(rep.lastVerified) : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <a
            href={apiService.getDownloadUrl(object.objectId)}
            download={object.filename}
            className="btn btn-primary"
          >
            Download Object
          </a>
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
