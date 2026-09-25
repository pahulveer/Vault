import React, { useState } from 'react';
import type { ObjectMetadata, ReplicationPolicy } from '../../types';
import { Badge } from '../common/Badge';
import { CopyButton } from '../common/CopyButton';
import { EmptyState } from '../common/EmptyState';
import { formatBytes, formatRelativeTime, truncateId } from '../../utils/formatters';
import { apiService } from '../../services/api';
import { ObjectDetailModal } from './ObjectDetailModal';
import { UploadModal } from './UploadModal';

interface ObjectBrowserProps {
  objects: ObjectMetadata[];
  policy: ReplicationPolicy | null;
  onRefresh: () => void;
  onRunIntegrityScan: () => void;
  isScanning: boolean;
}

export const ObjectBrowser: React.FC<ObjectBrowserProps> = ({
  objects,
  policy,
  onRefresh,
  onRunIntegrityScan,
  isScanning
}) => {
  const [selectedObject, setSelectedObject] = useState<ObjectMetadata | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE'>('ALL');

  const filteredObjects = objects.filter(obj => {
    const matchesSearch = 
      obj.objectId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      obj.filename.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || obj.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const desiredRF = policy?.replicationFactor || 3;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Controls Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px', maxWidth: '480px' }}>
          <input
            type="text"
            className="input"
            style={{ width: '100%' }}
            placeholder="Search by object ID or filename..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="ALL">All Health</option>
            <option value="HEALTHY">HEALTHY</option>
            <option value="DEGRADED">DEGRADED</option>
            <option value="UNAVAILABLE">UNAVAILABLE</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={onRunIntegrityScan}
            disabled={isScanning}
            className="btn btn-secondary"
            title="Scan checksums of all physical replicas across storage nodes"
          >
            {isScanning ? 'Scanning Integrity...' : '🛡 Run Integrity Scan'}
          </button>

          <button
            onClick={() => setShowUploadModal(true)}
            className="btn btn-primary"
          >
            + Upload Object
          </button>
        </div>
      </div>

      {/* Object Table */}
      {filteredObjects.length === 0 ? (
        <EmptyState
          title="No objects found"
          description={searchTerm || statusFilter !== 'ALL' ? "No objects match your filter criteria." : "No objects have been uploaded to Vault yet."}
          action={
            <button onClick={() => setShowUploadModal(true)} className="btn btn-primary">
              Upload Your First Object
            </button>
          }
        />
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Object</th>
                <th>Filename</th>
                <th>Size</th>
                <th>Version</th>
                <th>Replication</th>
                <th>Health</th>
                <th>Created</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredObjects.map((obj) => {
                const healthyCount = (obj.replicas || []).filter(r => r.status === 'HEALTHY').length;

                return (
                  <tr
                    key={obj.objectId}
                    onClick={() => setSelectedObject(obj)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="mono" style={{ fontWeight: 600, color: 'var(--color-info)' }}>
                          {truncateId(obj.objectId, 10, 6)}
                        </span>
                        <CopyButton text={obj.objectId} />
                      </div>
                    </td>

                    <td style={{ fontWeight: 500 }}>
                      {obj.filename}
                    </td>

                    <td className="mono">
                      {formatBytes(obj.size)}
                    </td>

                    <td className="mono" style={{ color: 'var(--text-secondary)' }}>
                      v{obj.version}
                    </td>

                    <td>
                      <span className="mono" style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: healthyCount >= desiredRF ? 'var(--color-success)' : 'var(--color-warning)'
                      }}>
                        {healthyCount}/{desiredRF}
                      </span>
                    </td>

                    <td>
                      <Badge status={obj.status} />
                    </td>

                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {formatRelativeTime(obj.createdAt)}
                    </td>

                    <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <a
                          href={apiService.getDownloadUrl(obj.objectId)}
                          download={obj.filename}
                          className="btn btn-secondary"
                          style={{ padding: '2px 8px', fontSize: '12px' }}
                          title="Download verified object"
                        >
                          Download
                        </a>
                        <button
                          onClick={() => setSelectedObject(obj)}
                          className="btn btn-secondary"
                          style={{ padding: '2px 8px', fontSize: '12px' }}
                        >
                          Inspect
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {selectedObject && (
        <ObjectDetailModal
          object={selectedObject}
          onClose={() => setSelectedObject(null)}
        />
      )}

      {showUploadModal && (
        <UploadModal
          policy={policy}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            onRefresh();
          }}
        />
      )}
    </div>
  );
};
