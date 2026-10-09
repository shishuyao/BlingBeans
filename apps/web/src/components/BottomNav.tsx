import type { AppView } from '../appContext';
import { useApp } from '../appContext';
import { useI18n, type MessageKey } from '../i18n';

const ITEMS: Array<{ id: AppView; icon: string; label: MessageKey }> = [
  { id: 'calendar', icon: '📅', label: 'navCalendar' },
  { id: 'tags', icon: '🏷', label: 'navTags' },
  { id: 'rewards', icon: '🎁', label: 'navRewards' },
  { id: 'summary', icon: '📊', label: 'navSummary' },
  { id: 'settings', icon: '⚙️', label: 'navSettings' },
];

export function BottomNav() {
  const { view, setView } = useApp();
  const { t } = useI18n();
  return (
    <nav className="bottom-nav" aria-label={t('navLabel')}>
      {ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`nav-item${view === item.id ? ' active' : ''}`}
          onClick={() => setView(item.id)}
        >
          <span className="nav-icon">{item.icon}</span>
          {t(item.label)}
        </button>
      ))}
    </nav>
  );
}
