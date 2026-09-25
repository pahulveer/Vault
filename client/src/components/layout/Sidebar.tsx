import React from 'react';

export type NavTab = 
  | 'overview' 
  | 'storage' 
  | 'objects' 
  | 'nodes' 
  | 'replication' 
  | 'repairs' 
  | 'network' 
  | 'rebalance' 
  | 'events' 
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  activeRepairsCount?: number;
  partitionCount?: number;
  rebalanceCount?: number;
}

interface NavItemConfig {
  id: NavTab;
  label: string;
  icon: string;
  badgeCount?: number;
  badgeVariant?: 'warning' | 'info';
}

interface NavGroup {
  groupTitle: string;
  items: NavItemConfig[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  activeRepairsCount = 0,
  partitionCount = 0,
  rebalanceCount = 0
}) => {
  const navGroups: NavGroup[] = [
    {
      groupTitle: 'Control Plane',
      items: [
        { id: 'overview', label: 'Overview', icon: '⊞' }
      ]
    },
    {
      groupTitle: 'Storage',
      items: [
        { id: 'objects', label: 'Objects', icon: '▤' },
        { id: 'nodes', label: 'Nodes', icon: '▦' },
        { id: 'replication', label: 'Replication', icon: '◈' }
      ]
    },
    {
      groupTitle: 'Operations',
      items: [
        { 
          id: 'repairs', 
          label: 'Repairs', 
          icon: '⚕',
          badgeCount: activeRepairsCount,
          badgeVariant: 'warning'
        },
        { 
          id: 'network', 
          label: 'Network', 
          icon: '⚡',
          badgeCount: partitionCount,
          badgeVariant: 'warning'
        },
        { 
          id: 'rebalance', 
          label: 'Rebalance', 
          icon: '⇌',
          badgeCount: rebalanceCount,
          badgeVariant: 'info'
        }
      ]
    },
    {
      groupTitle: 'System',
      items: [
        { id: 'events', label: 'Events', icon: '◷' },
        { id: 'settings', label: 'Settings', icon: '⚙' }
      ]
    }
  ];

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      backgroundColor: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '16px 10px',
      userSelect: 'none',
      flexShrink: 0
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {navGroups.map((group) => (
          <div key={group.groupTitle} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{
              padding: '4px 10px 6px 10px',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.6px'
            }}>
              {group.groupTitle}
            </div>

            {group.items.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: isActive ? 'var(--surface-elevated)' : 'transparent',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: isActive ? 600 : 400,
                    fontSize: '13px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background-color 150ms ease, color 150ms ease',
                    borderLeft: isActive ? '2px solid var(--color-success)' : '2px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '14px', width: '18px', textAlign: 'center', color: isActive ? 'var(--color-success)' : 'var(--text-muted)' }}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>

                  {item.badgeCount && item.badgeCount > 0 ? (
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '1px 6px',
                      borderRadius: '10px',
                      background: item.badgeVariant === 'warning' ? 'var(--color-warning-bg)' : 'var(--color-info-bg)',
                      color: item.badgeVariant === 'warning' ? 'var(--color-warning)' : 'var(--color-info)',
                      border: `1px solid ${item.badgeVariant === 'warning' ? 'var(--color-warning-border)' : 'var(--color-info-border)'}`
                    }}>
                      {item.badgeCount}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div style={{
        padding: '12px 10px',
        borderTop: '1px solid var(--border)',
        fontSize: '11px',
        color: 'var(--text-muted)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Vault Control Plane</span>
          <span className="mono">v5.0</span>
        </div>
        <div>Multi-Node Object Storage</div>
      </div>
    </aside>
  );
};
