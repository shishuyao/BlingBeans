import { useEffect, useState } from 'react';
import { api } from '../api';
import { useApp, type PinModalMode } from '../appContext';
import { useI18n } from '../i18n';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'] as const;

type Props = {
  mode: PinModalMode;
  onDone: (ok: boolean) => void;
};

export function PinGate({ mode, onDone }: Props) {
  const { hasPin } = useApp();
  const { t, tr } = useI18n();
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
      ? t('pinUnlockTitle')
      : mode === 'change'
        ? step === 'old'
          ? t('oldPin')
          : step === 'new'
            ? t('newPin')
            : t('confirmAgain')
        : step === 'confirm'
          ? t('confirmSetup')
          : t('setupPin');

  const subtitle = mode === 'unlock' ? t('unlockHint') : mode === 'setup' ? t('setupHint') : t('changeHint');

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
        setError(e instanceof Error ? e.message : t('unlockFail'));
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
        setError(t('pinMismatch'));
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
        setError(e instanceof Error ? e.message : t('setupFail'));
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
        {error ? <div className="error-banner">{tr(error)}</div> : null}
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
          {t('cancel')}
        </button>
      </div>
    </div>
  );
}
