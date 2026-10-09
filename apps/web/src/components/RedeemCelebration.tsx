import { useEffect, useRef } from 'react';
import type { RewardDto } from '@guoguo/shared';
import { playRedeemSound } from '../sound';
import { useI18n } from '../i18n';
import { CartoonBean } from './CartoonBean';

type Props = {
  reward: RewardDto;
  onDone: () => void;
};

const CONFETTI = ['#FF5252', '#FFD54F', '#66BB6A', '#42A5F5', '#AB47BC', '#FF8A65'];

export function RedeemCelebration({ reward, onDone }: Props) {
  const { t } = useI18n();
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    playRedeemSound();
    const t = setTimeout(() => onDoneRef.current(), 1800);
    return () => clearTimeout(t);
  }, [reward.id]);

  const beans = [
    { color: '#F5C518', variant: 'big' as const, size: 42, x: -108, y: -70 },
    { color: '#FF9800', variant: 'small' as const, size: 34, x: 110, y: -62 },
    { color: '#4CAF50', variant: 'small' as const, size: 32, x: -96, y: 78 },
    { color: '#2196F3', variant: 'small' as const, size: 30, x: 102, y: 86 },
  ];

  return (
    <div className="redeem-overlay" aria-live="polite">
      <div className="redeem-stage">
        {CONFETTI.map((color, i) => (
          <span
            key={color}
            className="redeem-confetti"
            style={
              {
                background: color,
                ['--cx' as string]: `${Math.cos((i / CONFETTI.length) * Math.PI * 2) * 92}px`,
                ['--cy' as string]: `${Math.sin((i / CONFETTI.length) * Math.PI * 2) * 78}px`,
                animationDelay: `${0.08 * i}s`,
              } as React.CSSProperties
            }
          />
        ))}
        {beans.map((b, i) => (
          <div
            key={i}
            className="redeem-bean"
            style={
              {
                ['--sx' as string]: `${b.x}px`,
                ['--sy' as string]: `${b.y}px`,
                animationDelay: `${0.05 * i}s`,
              } as React.CSSProperties
            }
          >
            <CartoonBean color={b.color} variant={b.variant} size={b.size} face="happy" />
          </div>
        ))}
        <div className="redeem-gift">
          {reward.photoUrl ? (
            <img src={reward.photoUrl} alt="" />
          ) : (
            <span className="redeem-gift-emoji">🎁</span>
          )}
        </div>
        <div className="redeem-copy">
          <div className="redeem-title">{t('redeemSuccess')}</div>
          <div className="redeem-name">{reward.title}</div>
        </div>
      </div>
    </div>
  );
}
