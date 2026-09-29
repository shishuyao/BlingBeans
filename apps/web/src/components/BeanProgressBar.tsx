import { useApp } from '../appContext';
import { CartoonBean } from './CartoonBean';

export function BeanProgressBar() {
  const { beans } = useApp();
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
      <div className="big-beans" title={danger ? '危险模式' : '黄金大豆豆'}>
        <CartoonBean color="#F5C518" variant="big" size={64} face={danger ? 'wink' : 'sparkle'} className="big-bean-svg" />
        <span className="big-count">×{beans.bigBeans}</span>
      </div>
      <div className="small-track" aria-label={`小豆豆 ${beans.smallBeans}/10`}>
        {slots.map((color, i) => (
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
        ))}
      </div>
    </div>
  );
}
