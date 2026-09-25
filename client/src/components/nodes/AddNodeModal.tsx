import React, { useState } from 'react';
import { apiService } from '../../services/api';

interface AddNodeModalProps {
  existingNodeIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export const AddNodeModal: React.FC<AddNodeModalProps> = ({
  existingNodeIds,
  onClose,
  onSuccess
}) => {
  // Suggest next node ID: e.g., node-05, node-06
  const getNextNodeId = () => {
    let nextNum = 1;
    existingNodeIds.forEach(id => {
      const match = id.match(/node-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num >= nextNum) nextNum = num + 1;
      }
    });
    return `node-${nextNum.toString().padStart(2, '0')}`;
  };

  const [nodeId, setNodeId] = useState(getNextNodeId());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nodeId.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await apiService.addNode(nodeId.trim());
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add node');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <h3 style={{ margin: 0, fontSize: '16px' }}>Add Storage Node</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {error && (
          <div className="banner banner-error" style={{ marginBottom: '16px' }}>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Node Identifier (Unique)
            </label>
            <input
              type="text"
              className="input mono"
              style={{ width: '100%' }}
              value={nodeId}
              onChange={(e) => setNodeId(e.target.value)}
              placeholder="e.g. node-05"
              required
            />
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              This will initialize simulated storage at <span className="mono">/storage/{nodeId}</span>, start heartbeat simulation, and trigger automatic background rebalancing.
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} disabled={loading} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading || !nodeId.trim()} className="btn btn-primary">
              {loading ? 'Initializing...' : 'Add Storage Node'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
