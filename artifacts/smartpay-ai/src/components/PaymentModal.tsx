import { useState } from 'react';
import {
  addTransaction, getSettings, checkBudgetAlert,
  BudgetAlertInfo, buildPaymentLink, buildAppOpenLink,
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
  gpay: '#4285F4',
  phonepe: '#5f259f',
  paytm: '#00B9F1',
  upi: '#FF6B00',
};

export default function PaymentModal({ open, onClose, onSuccess }: PaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [payee, setPayee] = useState('');           // UPI ID or 10-digit mobile
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<BudgetAlertInfo | null>(null);
  const [showAppSetup, setShowAppSetup] = useState(false);
  const [payeeError, setPayeeError] = useState('');

  const settings = getSettings();
  const cat = category || settings.categories[0] || 'Others';
  const appColor = APP_COLORS[settings.preferredPayApp] || '#00D65E';
  const appName = settings.payAppName || 'UPI App';

  const isValidPayee = (val: string) => {
    if (!val.trim()) return false;
    const isMobile = /^\d{10}$/.test(val.trim());
    const isUpi = /^[\w.\-+]+@[\w]+$/.test(val.trim());
    return isMobile || isUpi;
  };

  const handlePayPress = () => {
    if (!settings.preferredPayApp) { setShowAppSetup(true); return; }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;

    if (!isValidPayee(payee)) {
      setPayeeError('Enter a valid UPI ID (e.g. name@oksbi) or 10-digit mobile number');
      return;
    }
    setPayeeError('');
    setIsSubmitting(true);

    addTransaction({ amount: Number(amount), category: cat, note: note || `${cat} payment` });

    const link = buildPaymentLink(settings.preferredPayApp, payee, Number(amount), note);
    window.location.href = link;

    setTimeout(() => {
      const info = checkBudgetAlert(cat);
      setIsSubmitting(false);
      setAmount(''); setPayee(''); setNote(''); setCategory('');
      onSuccess();
      onClose();
      if (info.kind !== 'none') setAlert(info);
    }, 600);
  };

  const inputStyle: React.CSSProperties = {
    background: 'hsl(222 40% 16%)',
    border: '1px solid hsl(222 35% 22%)',
  };

  return (
    <>
      <BottomSheet isOpen={open} onClose={onClose} title="New Payment">
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
            <button onClick={() => setShowAppSetup(true)} className="text-xs underline underline-offset-2 text-muted-foreground">
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

          {/* Pay to — UPI ID or Mobile */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Pay to
            </label>
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
                    : { background: 'hsl(222 35% 18%)', color: 'hsl(215 20% 65%)' }}
                >
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
            disabled={!amount || isSubmitting}
            className="mt-1 w-full py-4 rounded-xl font-bold text-base transition-all active:scale-[0.98] disabled:opacity-40"
            style={{ background: isSubmitting ? 'hsl(222 35% 22%)' : '#00D65E', color: isSubmitting ? '#666' : '#000' }}
          >
            {isSubmitting ? 'Opening...' : `Pay ₹${Number(amount || 0).toLocaleString('en-IN')} via ${appName}`}
          </button>

          <p className="text-center text-[10px] text-muted-foreground -mt-1">
            Logs the payment · Opens {appName} to complete it
          </p>
        </div>
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
