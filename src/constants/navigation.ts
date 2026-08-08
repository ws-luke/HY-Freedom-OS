export interface NavItem {
  name: string
  path: string
  label: string
}

export const NAV_ITEMS: NavItem[] = [
  { name: 'mission-control', path: '/', label: '任務總控台' },
  { name: 'planning', path: '/planning', label: '盤前規劃' },
  { name: 'economic-calendar', path: '/economic-calendar', label: '經濟日曆' },
  { name: 'trades', path: '/trades', label: '交易紀錄' },
  { name: 'playbook', path: '/playbook', label: '交易策略庫' },
  { name: 'review', path: '/review', label: '復盤與檢討' },
  { name: 'ai-coach',  path: '/ai-coach',  label: 'AI 教練',},
  { name: 'accounts', path: '/accounts', label: '帳戶管理' },
  { name: 'investment', path: '/investment', label: '資金管理' },
  { name: 'tools', path: '/tools', label: '工具箱' },
  { name: 'settings', path: '/settings', label: '設定中心' },
]
