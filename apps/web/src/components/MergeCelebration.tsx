import { useEffect, useState } from 'react';
import { playMergeSound } from '../sound';
import { useApp } from '../appContext';
import { CartoonBean } from './CartoonBean';

export function MergeCelebration() {
  const { mergeQueue, shiftMerge } = useApp();
  const [visible, setVisible] = useState(false);
  const event = mergeQueue[0];

  useEffect(() => {
    if (!event) {
      setVisible(false);
      return;
    }
    setVisible(true);
    playMergeSound();
    const t = setTimeout(() => {
      shiftMerge();
    }, 1600);
    return () => clearTimeout(t);
  }, [event, shiftMerge]);

  if (!visible || !event) return null;

  const positions = event.colors.map((color, i) => {
    const angle = (i / event.colors.length) * Math.PI * 2 - Math.PI / 2;
    const r = 78;
    return {
      sx: `${Math.cos(angle) * r}px`,
      sy: `${Math.sin(angle) * r}px`,
      color,
    };
  });

  return (
    <div className="merge-overlay" aria-live="polite">
      <div className="merge-stage">
        {positions.map((p, i) => (
          <div
            key={i}
            className="merge-mini"
            style={
              {
                left: '50%',
                top: '50%',
                marginLeft: -18,
                marginTop: -18,
                ['--sx' as string]: p.sx,
                ['--sy' as string]: p.sy,
              } as React.CSSProperties
            }
          >
            <CartoonBean color={p.color} size={36} face="happy" />
          </div>
        ))}
        <div className="merge-big">
          <CartoonBean color="#F5C518" variant="big" size={110} face="sparkle" />
        </div>
        <div className="merge-text">合成大豆豆！</div>
      </div>
    </div>
  );
}
