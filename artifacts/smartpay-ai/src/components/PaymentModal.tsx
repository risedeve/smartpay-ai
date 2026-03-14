import { useState } from 'react';
import {
  addTransaction, getSettings, checkBudgetAlert,
  BudgetAlertInfo, buildUpiLink,
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
  const [payeeUpi, setPayeeUpi] = useState('');
  const [payeeName, setPayeeName] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<BudgetAlertInfo | null>(null);
  const [showAppSetup, setShowAppSetup] = useState(false);

  const settings = getSettings();
  const cat = category || settings.categories[0] || 'Others';
  const appColor = APP_COLORS[settings.preferredPayApp] || '#00D65E';

  // If no preferred app set, show setup first
  const handlePayPress = () => {
    if (!settings.preferredPayApp) {
      setShowAppSetup(true);
      return;
    }
    submitPayment();
  };

  const submitPayment = () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;
    if (!payeeUpi.trim()) return;

    setIsSubmitting(true);

    // Record in SmartPay AI
    addTransaction({ amount: Number(amount), category: cat, note: note || `Paid to ${payeeName || payeeUpi}` });

    // Open UPI app
    const link = buildUpiLink(settings.preferredPayApp, payeeUpi.trim(), Number(amount), payeeName || 'Merchant', note);
    window.location.href = link;

    setTimeout(() => {
      const info = checkBudgetAlert(cat);
      setIsSubmitting(false);
      // Reset fields
      setAmount(''); setPayeeUpi(''); setPayeeName(''); setNote('');
      onSuccess();
      onClose();
      if (info.kind !== 'none') setAlert(info);
    }, 800);
  };

  const inputStyle: React.CSSProperties = {
    background: 'hsl(222 40% 16%)',
    border: '1px solid hsl(222 35% 22%)',
  };

  const refreshedSettings = getSettings();
  const appName = refreshedSettings.payAppName || 'UPI App';

  return (
    <>
      <BottomSheet isOpen={open} onClose={onClose} title="New Payment">
        <div className="flex flex-col gap-4">

          {/* Preferred app badge */}
          <div className="flex items-center justify-between">
            {refreshedSettings.preferredPayApp ? (
              <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full font-semibold"
                style={{ background: `${appColor}15`, color: appColor, border: `1px solid ${appColor}30` }}>
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: appColor }} />
                Paying via {appName}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">No payment app selected</div>
            )}
            <button
              onClick={() => setShowAppSetup(true)}
              className="text-xs underline underline-offset-2 text-muted-foreground"
            >
              {refreshedSettings.preferredPayApp ? 'Change' : 'Select App'}
            </button>
          </div>

          {/* Amount */}
          <div className="flex flex-col items-center justify-center py-5 rounded-2xl" style={inputStyle}>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Amount</span>
            <div className="flex items-center text-5xl font-display font-bold text-foreground">
              <span className="text-3xl text-muted-foreground mr-1">₹</span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                autoFocus
                className="bg-transparent border-none outline-none w-full max-w-[200px] text-center placeholder:text-muted-foreground/30"
              />
            </div>
          </div>

          {/* Payee UPI ID */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Pay to (UPI ID) <span style={{ color: '#FF4444' }}>*</span>
            </label>
            <input
              type="text"
              value={payeeUpi}
              onChange={e => setPayeeUpi(e.target.value)}
              placeholder="example@oksbi / merchant@ybl"
              className="w-full px-4 py-3 text-sm text-foreground rounded-xl outline-none"
              style={inputStyle}
            />
          </div>

          {/* Payee Name (optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Payee Name (optional)</label>
            <input
              type="text"
              value={payeeName}
              onChange={e => setPayeeName(e.target.value)}
              placeholder="e.g. Raj's Cafe"
              className="w-full px-4 py-3 text-sm text-foreground rounded-xl outline-none"
              style={inputStyle}
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</label>
            <div className="grid grid-cols-4 gap-1.5">
              {settings.categories.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className="py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all active:scale-95"
                  style={
                    cat === c
                      ? { background: '#00D65E', color: '#000' }
                      : { background: 'hsl(222 35% 18%)', color: 'hsl(215 20% 65%)' }
                  }
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
              placeholder="What is this payment for?"
              className="w-full px-4 py-3 text-sm text-foreground rounded-xl outline-none"
              style={inputStyle}
            />
          </div>

          {/* Pay button */}
          <button
            onClick={handlePayPress}
            disabled={!amount || !payeeUpi.trim() || isSubmitting}
            className="mt-1 w-full py-4 rounded-xl text-black font-bold text-base transition-all active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: isSubmitting ? 'hsl(222 35% 22%)' : '#00D65E', color: isSubmitting ? '#666' : '#000' }}
          >
            {isSubmitting ? 'Opening...' : (
              <>
                Pay ₹{Number(amount || 0).toLocaleString('en-IN')} via {appName}
              </>
            )}
          </button>

          <p className="text-center text-[10px] text-muted-foreground -mt-1">
            Opens {appName} · Payment is tracked in SmartPay AI
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

      <PayAppSetupModal
        open={showAppSetup}
        onDone={() => setShowAppSetup(false)}
      />
    </>
  );
}
