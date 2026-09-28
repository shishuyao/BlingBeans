import { useEffect, useState } from 'react';
import { api } from '../api';
import { useApp, type PinModalMode } from '../appContext';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'] as const;

type Props = {
  mode: PinModalMode;
  onDone: (ok: boolean) => void;
};

export function PinGate({ mode, onDone }: Props) {
  const { hasPin } = useApp();
  const [pin, setPin] = useState('');
  const [oldPin, setOldPin] = useState('');
  const [step, setStep] = useState<'old' | 'new' | 'confirm'>(
    mode === 'change' ? 'old' : mode === 'setup' ? 'new' : 'new'
  );
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const title =
    mode === 'unlock'
      ? '家长解锁'
      : mode === 'change'
        ? step === 'old'
          ? '输入旧 PIN'
          : step === 'new'
            ? '设置新 PIN'
            : '再输入一次'
        : step === 'confirm'
          ? '再输入一次确认'
          : '设置家长 PIN';

  const subtitle =
    mode === 'unlock'
      ? '输入 4 位数字后才能打卡或兑奖'
      : mode === 'setup'
        ? '防止小朋友自己乱加豆豆'
        : '修改后请牢记新 PIN';

  const activeValue =
    mode === 'change' && step === 'old'
      ? oldPin
      : step === 'confirm'
        ? confirmPin
        : pin;

  const setActive = (next: string) => {
    if (mode === 'change' && step === 'old') setOldPin(next);
    else if (step === 'confirm') setConfirmPin(next);
    else setPin(next);
  };

  useEffect(() => {
    if (activeValue.length < 4) return;
    void handleComplete(activeValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeValue]);

  const handleComplete = async (value: string) => {
    if (busy) return;
    setError('');

    if (mode === 'unlock') {
      setBusy(true);
      try {
        await api.pin.unlock(value);
        onDone(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : '解锁失败');
        setPin('');
      } finally {
        setBusy(false);
      }
      return;
    }

    if (mode === 'setup' || mode === 'change') {
      if (mode === 'change' && step === 'old') {
        setStep('new');
        return;
      }
      if (step === 'new') {
        setStep('confirm');
        return;
      }
      if (value !== pin) {
        setError('两次输入不一致');
        setConfirmPin('');
        setPin('');
        setStep(mode === 'change' ? 'new' : 'new');
        return;
      }
      setBusy(true);
      try {
        await api.pin.setup({
          pin: value,
          oldPin: mode === 'change' ? oldPin : undefined,
        });
        onDone(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : '设置失败');
        setPin('');
        setConfirmPin('');
        setOldPin('');
        setStep(mode === 'change' ? 'old' : 'new');
      } finally {
        setBusy(false);
      }
    }
  };

  const press = (key: string) => {
    if (busy || key === '') return;
    if (key === '⌫') {
      setActive(activeValue.slice(0, -1));
      return;
    }
    if (activeValue.length >= 4) return;
    setActive(activeValue + key);
  };

  return (
    <div className="pin-overlay" role="dialog" aria-modal aria-label={title}>
      <div className="pin-card">
        <h3>{title}</h3>
        <p className="pin-sub">{subtitle}</p>
        {hasPin && mode === 'setup' ? null : null}
        <div className="pin-dots" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`pin-dot${i < activeValue.length ? ' filled' : ''}`} />
          ))}
        </div>
        {error ? <div className="error-banner">{error}</div> : null}
        <div className="pin-pad">
          {KEYS.map((key, i) => (
            <button
              key={`${key}-${i}`}
              type="button"
              className={`pin-key${key === '' ? ' empty' : ''}${key === '⌫' ? ' back' : ''}`}
              disabled={key === '' || busy}
              onClick={() => press(key)}
            >
              {key}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-ghost" style={{ width: '100%', marginTop: 12 }} onClick={() => onDone(false)} disabled={busy}>
          取消
        </button>
      </div>
    </div>
  );
}
