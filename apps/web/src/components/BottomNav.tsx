import type { AppView } from '../appContext';
import { useApp } from '../appContext';

const ITEMS: Array<{ id: AppView; icon: string; label: string }> = [
  { id: 'calendar', icon: '📅', label: '日历' },
  { id: 'tags', icon: '🏷', label: '标签' },
  { id: 'rewards', icon: '🎁', label: '奖励' },
  { id: 'summary', icon: '📊', label: '总结' },
  { id: 'settings', icon: '⚙️', label: '设置' },
];

export function BottomNav() {
  const { view, setView } = useApp();
  return (
    <nav className="bottom-nav" aria-label="主导航">
      {ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`nav-item${view === item.id ? ' active' : ''}`}
          onClick={() => setView(item.id)}
        >
          <span className="nav-icon">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </nav>
  );
}
