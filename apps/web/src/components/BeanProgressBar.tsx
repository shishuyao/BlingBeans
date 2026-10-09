import { useApp } from '../appContext';
import { useI18n } from '../i18n';
import { CartoonBean } from './CartoonBean';

export function BeanProgressBar() {
  const { beans } = useApp();
  const { t } = useI18n();
  if (!beans) {
    return (
      <div className="bean-bar">
        <div className="small-track">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="small-slot" />
          ))}
        </div>
      </div>
    );
  }

  const slots = Array.from({ length: 10 }).map((_, i) => beans.slotColors[i] ?? null);
  const danger = beans.dangerLocked;

  return (
    <div className={`bean-bar${danger ? ' danger' : ''}`}>
      <div className="big-beans" title={danger ? t('dangerModeTitle') : t('bigBeanTitle')}>
        <CartoonBean color="#F5C518" variant="big" size={64} face={danger ? 'wink' : 'sparkle'} className="big-bean-svg" />
        <span className="big-count">×{beans.bigBeans}</span>
      </div>
      <div
        className="small-track"
        aria-label={
          beans.smallBeans < 0 ? t('debtAria', { n: Math.abs(beans.smallBeans) }) : t('smallAria', { n: beans.smallBeans })
        }
      >
        {beans.smallBeans < 0 ? (
          <div className="debt-label">{t('debtLabel', { n: Math.abs(beans.smallBeans) })}</div>
        ) : (
          slots.map((color, i) => (
            <div key={i} className="small-slot">
              {color ? (
                <CartoonBean
                  color={color}
                  variant="small"
                  size="92%"
                  face={i % 3 === 0 ? 'wink' : 'happy'}
                  className="small-bean-svg"
                />
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
