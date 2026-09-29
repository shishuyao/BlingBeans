import { useEffect, useRef, useState } from 'react';
import type { RevealEvent } from '@guoguo/shared';
import { playBoxOpenSound, playDangerRevealSound, playHappyRevealSound } from '../sound';

type Props = {
  event: RevealEvent;
  onDone: () => void;
};

type Phase = 'wiggle' | 'open' | 'result';

export function MysteryReveal({ event, onDone }: Props) {
  const [phase, setPhase] = useState<Phase>('wiggle');
  const happy = event.kind === 'happy';
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    playBoxOpenSound();
    const open = window.setTimeout(() => setPhase('open'), 420);
    const result = window.setTimeout(() => {
      setPhase('result');
      if (event.kind === 'happy') playHappyRevealSound();
      else playDangerRevealSound();
    }, 980);
    const done = window.setTimeout(() => onDoneRef.current(), happy ? 3400 : 3800);
    return () => {
      window.clearTimeout(open);
      window.clearTimeout(result);
      window.clearTimeout(done);
    };
  }, [event, happy]);

  return (
    <div
      className="mystery-overlay"
      onClick={() => phase === 'result' && onDone()}
      role="dialog"
      aria-label={happy ? '开心日揭晓' : '危险日揭晓'}
    >
      <div className={`mystery-stage ${phase}${happy ? ' happy' : ' danger'}`}>
        <div className="gift-scene" aria-hidden>
          <div className={`gift-3d ${phase}`}>
            <div className="gift-3d-lid">
              <span className="bow-loop left" />
              <span className="bow-loop right" />
              <span className="bow-knot" />
              <span className="bow-tail left" />
              <span className="bow-tail right" />
              <span className="lid-ribbon" />
            </div>
            <div className="gift-3d-body">
              <span className="body-shine" />
              <span className="ribbon-v" />
              <span className="ribbon-h" />
              <span className="gift-inside">
                {happy ? <span className="inside-bean" /> : <span className="inside-warn">!</span>}
              </span>
            </div>
            <div className="gift-glow" />
          </div>
        </div>

        {phase === 'result' ? (
          happy ? (
            <div className="mystery-result">
              <div className="confetti" aria-hidden>
                {Array.from({ length: 16 }).map((_, i) => (
                  <i key={i} style={{ ['--i' as string]: i }} />
                ))}
              </div>
              <p className="mystery-kicker">开心日！</p>
              <p className="mystery-mult">×{event.multiplier.toFixed(1)}</p>
              <p className="mystery-sub">盒子打开啦，今天豆豆会变多</p>
            </div>
          ) : (
            <div className="mystery-result">
              <p className="mystery-kicker danger">危险日</p>
              <p className="mystery-warn">今天要集齐 {event.dangerNeed} 颗豆</p>
              <p className="mystery-sub">集不够，第二天会扣这么多</p>
            </div>
          )
        ) : (
          <p className="mystery-kicker">{phase === 'wiggle' ? '摇一摇…' : '打开啦！'}</p>
        )}
      </div>
    </div>
  );
}
