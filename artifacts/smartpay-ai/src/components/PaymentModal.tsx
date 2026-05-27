import { useState } from 'react';
import { Smartphone, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import {
  addTransaction, getSettings, checkBudgetAlert,
  BudgetAlertInfo, buildPaymentLink, buildFallbackUpiLink,
} from '@/lib/storage';
import BottomSheet from './BottomSheet';
import BudgetAlertModal from './BudgetAlertModal';
import PayAppSetupModal from './PayAppSetupModal';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const APP_COLORS: Record<string, string> = {
  gpay: '#4285F4', phonepe: '#5f259f', paytm: '#00B9F1', upi: '#FF6B00',
};

type Step = 'pay' | 'confirm';

function openUpiLink(link: string) {
  // Anchor-click method is more reliable than window.location.href for
  // deep-link schemes (tez://, phonepe://, paytmmp://, upi://) on Android
  const a = document.createElement('a');
  a.href = link;
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default function PaymentModal({ open, onClose, onSuccess }: PaymentModalProps) {
  const [step, setStep] = useState<Step>('pay');
  const [amount, setAmount] = useState('');
  const [payee, setPayee] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [alert, setAlert] = useState<BudgetAlertInfo | null>(null);
  const [showAppSetup, setShowAppSetup] = useState(false);
  const [payeeError, setPayeeError] = useState('');
  const [primaryLink, setPrimaryLink] = useState('');
  const [fallbackLink, setFallbackLink] = useState('');
  const [appOpenError, setAppOpenError] = useState(false);

  const settings = getSettings();
  const cat = category || settings.categories[0] || 'Others';
  const appColor = APP_COLORS[settings.preferredPayApp] || '#00D65E';
  const appName = settings.payAppName || 'UPI App';

  const isValidPayee = (val: string) => {
    if (!val.trim()) return false;
    return /^\d{10}$/.test(val.trim()) || /^[\w.\-+]+@[\w]+$/.test(val.trim());
  };

  // Step 1 → open UPI app, show confirm screen
  const handlePayPress = () => {
    if (!settings.preferredPayApp) { setShowAppSetup(true); return; }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;
    if (!isValidPayee(payee)) {
      setPayeeError('Enter a valid UPI ID (e.g. name@oksbi) or 10-digit mobile number');
      return;
    }
    setPayeeError('');

    const primary  = buildPaymentLink(settings.preferredPayApp, payee, Number(amount), note);
    const fallback = buildFallbackUpiLink(payee, Number(amount), note);
    setPrimaryLink(primary);
    setFallbackLink(fallback);
    setAppOpenError(false);
    setStep('confirm');

    try {
      openUpiLink(primary);
    } catch {
      setAppOpenError(true);
    }
  };

  // Step 2: user confirms payment succeeded → save transaction
  const handleConfirmSuccess = () => {
    addTransaction({
      amount: Number(amount),
      category: cat,
      note: note || `${cat} payment`,
    });
    const info = checkBudgetAlert(cat);
    setAmount(''); setPayee(''); setNote(''); setCategory('');
    setStep('pay');
    onSuccess();
    onClose();
    if (info.kind !== 'none') setAlert(info);
  };

  // Step 2: payment failed / cancelled → go back
  const handleConfirmCancel = () => {
    setStep('pay');
    setAppOpenError(false);
  };

  const handleClose = () => {
    setStep('pay');
    setAppOpenError(false);
    onClose();
  };

  const inputStyle: React.CSSProperties = {
    background: 'hsl(222 40% 16%)',
    border: '1px solid hsl(222 35% 22%)',
  };

  return (
    <>
      <BottomSheet
        isOpen={open}
        onClose={handleClose}
        title={step === 'pay' ? 'New Payment' : 'Confirm Payment'}
      >

        {/* ── STEP: PAY ── */}
        {step === 'pay' && (
          <div className="flex flex-col gap-4">
            {/* App badge */}
            <div className="flex items-center justify-between">
              {settings.preferredPayApp ? (
                <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full font-semibold"
                  style={{ background: `${appColor}15`, color: appColor, border: `1px solid ${appColor}30` }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: appColor }} />
                  Opens {appName}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">No payment app selected</div>
              )}
              <button onClick={() => setShowAppSetup(true)}
                className="text-xs underline underline-offset-2 text-muted-foreground">
                {settings.preferredPayApp ? 'Change' : 'Select App'}
              </button>
            </div>

            {/* Amount */}
            <div className="flex flex-col items-center justify-center py-5 rounded-2xl" style={inputStyle}>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Amount</span>
              <div className="flex items-center">
                <span className="text-3xl text-muted-foreground mr-1 font-display">₹</span>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0"
                  autoFocus
                  className="bg-transparent border-none outline-none w-40 text-5xl text-center font-display font-bold text-foreground placeholder:text-muted-foreground/30"
                />
              </div>
            </div>

            {/* Pay to */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pay to</label>
              <input
                type="text"
                value={payee}
                onChange={e => { setPayee(e.target.value); setPayeeError(''); }}
                placeholder="UPI ID (name@bank) or Mobile number"
                className="w-full px-4 py-3 text-sm text-foreground rounded-xl outline-none"
                style={{
                  ...inputStyle,
                  border: payeeError ? '1px solid #FF4444' : '1px solid hsl(222 35% 22%)',
                }}
              />
              {payeeError && <p className="text-xs" style={{ color: '#FF4444' }}>{payeeError}</p>}
              {payee && isValidPayee(payee) && (
                <p className="text-xs" style={{ color: '#00D65E' }}>
                  {/^\d{10}$/.test(payee.trim()) ? '✓ Mobile number' : '✓ UPI ID'}
                </p>
              )}
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</label>
              <div className="grid grid-cols-4 gap-1.5">
                {settings.categories.map(c => (
                  <button key={c} type="button" onClick={() => setCategory(c)}
                    className="py-2 px-1 rounded-lg text-[11px] font-semibold transition-all active:scale-95"
                    style={cat === c
                      ? { background: '#00D65E', color: '#000' }
                      : { background: 'hsl(222 35% 18%)', color: 'hsl(215 20% 65%)' }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Note (optional)</label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="What is this for?"
                className="w-full px-4 py-3 text-sm text-foreground rounded-xl outline-none"
                style={inputStyle}
              />
            </div>

            {/* Pay button */}
            <button
              onClick={handlePayPress}
              disabled={!amount}
              className="mt-1 w-full py-4 rounded-xl font-bold text-base transition-all active:scale-[0.98] disabled:opacity-40"
              style={{ background: '#00D65E', color: '#000' }}
            >
              Pay ₹{Number(amount || 0).toLocaleString('en-IN')} via {appName}
            </button>

            <p className="text-center text-[10px] text-muted-foreground -mt-1">
              You will confirm after the payment completes
            </p>
          </div>
        )}

        {/* ── STEP: CONFIRM ── */}
        {step === 'confirm' && (
          <div className="flex flex-col gap-4 py-2">
            {/* Icon + heading */}
            <div className="flex flex-col items-center text-center pt-3 pb-1 gap-3">
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: `${appColor}18`, border: `2px solid ${appColor}40` }}>
                <Smartphone className="w-8 h-8" style={{ color: appColor }} />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Complete in {appName}</h2>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-[260px]">
                  Finish the payment in your UPI app, then come back here and confirm.
                </p>
              </div>
            </div>

            {/* Payment summary */}
            <div className="rounded-2xl p-4 space-y-2.5" style={inputStyle}>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Paying to</span>
                <span className="text-xs font-semibold text-foreground">{payee}</span>
              </div>
              <div className="flex justify-between items-center"
                style={{ borderTop: '1px solid hsl(222 35% 20%)', paddingTop: 10 }}>
                <span className="text-xs text-muted-foreground">Amount</span>
                <span className="text-lg font-bold" style={{ color: '#00D65E' }}>
                  ₹{Number(amount).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between items-center"
                style={{ borderTop: '1px solid hsl(222 35% 20%)', paddingTop: 10 }}>
                <span className="text-xs text-muted-foreground">Category</span>
                <span className="text-xs font-semibold text-foreground">{cat}</span>
              </div>
              {note ? (
                <div className="flex justify-between items-center"
                  style={{ borderTop: '1px solid hsl(222 35% 20%)', paddingTop: 10 }}>
                  <span className="text-xs text-muted-foreground">Note</span>
                  <span className="text-xs text-foreground">{note}</span>
                </div>
              ) : null}
            </div>

            {/* App didn't open */}
            {appOpenError && (
              <div className="flex items-center gap-2 p-3 rounded-xl"
                style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.25)' }}>
                <AlertCircle className="w-4 h-4 shrink-0" style={{ color: '#FF4444' }} />
                <p className="text-[11px]" style={{ color: '#FF4444' }}>
                  App didn't open.{' '}
                  <button
                    onClick={() => { setAppOpenError(false); openUpiLink(fallbackLink); }}
                    className="underline underline-offset-2 font-semibold">
                    Try generic UPI
                  </button>
                </p>
              </div>
            )}

            {!appOpenError && (
              <button
                onClick={() => openUpiLink(fallbackLink)}
                className="text-center text-xs text-muted-foreground underline underline-offset-2">
                App didn't open? Try generic UPI link
              </button>
            )}

            <p className="text-center text-xs font-semibold text-muted-foreground">
              Did the payment go through?
            </p>

            {/* Confirm / Cancel */}
            <div className="flex gap-3">
              <button
                onClick={handleConfirmCancel}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm"
                style={{ background: 'hsl(222 40% 16%)', color: 'hsl(215 20% 65%)', border: '1px solid hsl(222 35% 22%)' }}>
                <XCircle className="w-4 h-4" />
                No, go back
              </button>
              <button
                onClick={handleConfirmSuccess}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm"
                style={{ background: '#00D65E', color: '#000' }}>
                <CheckCircle2 className="w-4 h-4" />
                Yes, paid!
              </button>
            </div>

            <p className="text-center text-[10px] text-muted-foreground -mt-1">
              Transaction is recorded only after you confirm
            </p>
          </div>
        )}
      </BottomSheet>

      {alert && (
        <BudgetAlertModal
          open={!!alert}
          onClose={() => setAlert(null)}
          type={alert.kind === 'none' ? 'no_budget' : alert.kind}
          category={alert.category}
          spent={alert.spent}
          budget={alert.budget}
        />
      )}

      <PayAppSetupModal open={showAppSetup} onDone={() => setShowAppSetup(false)} />
    </>
  );
}
