export interface NavItem {
  name: string
  path: string
  label: string
}

export const NAV_ITEMS: NavItem[] = [
  { name: 'mission-control', path: '/', label: 'Mission Control' },
  { name: 'planning', path: '/planning', label: 'Planning' },
  { name: 'economic-calendar', path: '/economic-calendar', label: 'Economic Calendar' },
  { name: 'trades', path: '/trades', label: 'Trades' },
  { name: 'playbook', path: '/playbook', label: 'Playbook' },
  { name: 'review', path: '/review', label: 'Review' },
  { name: 'accounts', path: '/accounts', label: 'Accounts' },
  { name: 'investment', path: '/investment', label: 'Investment' },
  { name: 'tools', path: '/tools', label: 'Tools' },
  { name: 'settings', path: '/settings', label: 'Settings' },
]
