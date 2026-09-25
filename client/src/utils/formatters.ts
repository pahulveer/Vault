export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0 || isNaN(bytes)) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return 'Never';
  const timestamp = new Date(dateStr).getTime();
  if (isNaN(timestamp)) return dateStr;
  const diffSec = Math.round((Date.now() - timestamp) / 1000);
  if (diffSec < 0) return 'just now';
  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  return `${Math.floor(diffHour / 24)}d ago`;
}

export function truncateId(id: string, start: number = 8, end: number = 6): string {
  if (!id) return '';
  if (id.length <= start + end + 3) return id;
  return `${id.substring(0, start)}...${id.substring(id.length - end)}`;
}

export function truncateChecksum(checksum: string): string {
  if (!checksum) return '';
  const clean = checksum.replace(/^sha256:/, '');
  return `${clean.substring(0, 10)}...${clean.substring(clean.length - 8)}`;
}

export function formatEventSummary(evt: { type: string; message: string; nodeId?: string; objectId?: string }): {
  title: string;
  subtitle: string;
  icon: string;
  badgeStatus: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE' | 'NORMAL';
} {
  const type = evt.type || '';
  if (type === 'NODE_FAILED') {
    return {
      title: 'Node failure detected',
      subtitle: `${evt.nodeId || 'Storage node'} became unavailable`,
      icon: '⚠',
      badgeStatus: 'DEGRADED'
    };
  }
  if (type === 'NODE_RECOVERED') {
    return {
      title: 'Node recovered',
      subtitle: `${evt.nodeId || 'Storage node'} is online and verified`,
      icon: '✓',
      badgeStatus: 'HEALTHY'
    };
  }
  if (type === 'NODE_ADDED') {
    return {
      title: 'Storage node added',
      subtitle: `${evt.nodeId || 'New node'} joined cluster topology`,
      icon: '✓',
      badgeStatus: 'HEALTHY'
    };
  }
  if (type.includes('REPAIR_COMPLETED') || type === 'REPLICA_STORED') {
    return {
      title: 'Replica repaired',
      subtitle: `Object replica restored on ${evt.nodeId || 'node'}`,
      icon: '✓',
      badgeStatus: 'HEALTHY'
    };
  }
  if (type === 'REPAIR_QUEUED') {
    return {
      title: 'Self-healing queued',
      subtitle: `Object degraded — repair scheduled`,
      icon: '⚕',
      badgeStatus: 'NORMAL'
    };
  }
  if (type === 'OBJECT_STORED') {
    return {
      title: 'Object uploaded',
      subtitle: 'Data stored and replicated successfully',
      icon: '✓',
      badgeStatus: 'HEALTHY'
    };
  }
  if (type === 'NETWORK_PARTITION') {
    return {
      title: 'Network partition active',
      subtitle: evt.message.replace('Partition created between ', 'Isolated between '),
      icon: '⚡',
      badgeStatus: 'DEGRADED'
    };
  }
  if (type === 'NETWORK_HEALED') {
    return {
      title: 'Network partition healed',
      subtitle: evt.message.replace('Partition healed between ', 'Reconnected '),
      icon: '✓',
      badgeStatus: 'HEALTHY'
    };
  }
  if (type.includes('REBALANCE')) {
    return {
      title: 'Rebalance active',
      subtitle: evt.message,
      icon: '⇌',
      badgeStatus: 'NORMAL'
    };
  }
  if (type === 'CLUSTER_RESET') {
    return {
      title: 'Cluster reset',
      subtitle: 'Restored to clean 4-node cluster',
      icon: '↺',
      badgeStatus: 'NORMAL'
    };
  }

  return {
    title: type.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' '),
    subtitle: evt.message,
    icon: '•',
    badgeStatus: 'NORMAL'
  };
}
