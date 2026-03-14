import { useState, useEffect } from 'react';
import { QrCode, Store } from 'lucide-react';
import {
  addTransaction, getSettings, checkBudgetAlert,
  BudgetAlertInfo, buildUpiLink,
} from '@/lib/storage';
import BottomSheet from './BottomSheet';
import BudgetAlertModal from './BudgetAlertModal';
import PayAppSetupModal from './PayAppSetupModal';

interface ScanPayModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Simulated QR merchant data
const MOCK_MERCHANT = { name: 'Local Cafe & Store', upiId: 'localcafe@oksbi', category: 'Food' };

const APP_COLORS: Record<string, string> = {
  gpay: '#4285F4', phonepe: '#5f259f', paytm: '#00B9F1', upi: '#FF6B00',
};

export default function ScanPayModal({ open, onClose, onSuccess }: ScanPayModalProps) {
  const [step, setStep] = useState<'scan' | 'pay'>('scan');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<BudgetAlertInfo | null>(null);
  const [showAppSetup, setShowAppSetup] = useState(false);

  const settings = getSettings();
  const appColor = APP_COLORS[settings.preferredPayApp] || '#00D65E';

  useEffect(() => {
    if (open) {
      setStep('scan');
      setAmount('');
      const timer = setTimeout(() => setStep('pay'), 2000);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handlePay = () => {
    const s = getSettings();
    if (!s.preferredPayApp) { setShowAppSetup(true); return; }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;

    setIsSubmitting(true);
    addTransaction({ amount: Number(amount), category: MOCK_MERCHANT.category, note: `Payment to ${MOCK_MERCHANT.name}` });

    const link = buildUpiLink(s.preferredPayApp, MOCK_MERCHANT.upiId, Number(amount), MOCK_MERCHANT.name, `SmartPay: ${MOCK_MERCHANT.category}`);
    window.location.href = link;

    setTimeout(() => {
      const info = checkBudgetAlert(MOCK_MERCHANT.category);
      setIsSubmitting(false);
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
      <BottomSheet isOpen={open} onClose={onClose} title={step === 'scan' ? 'Scan QR' : 'Pay Merchant'}>
        {step === 'scan' ? (
          <div className="flex flex-col items-center justify-center py-10 min-h-[300px]">
            <div className="relative w-48 h-48 rounded-3xl overflow-hidden flex items-center justify-center mb-6"
              style={{ border: '2px solid rgba(0,214,94,0.4)', background: 'hsl(222 40% 10%)' }}>
              <QrCode className="w-20 h-20 text-muted-foreground/30" />
              <div className="absolute top-0 left-0 w-full h-[2px] animate-scan"
                style={{ background: '#00D65E', boxShadow: '0 0 8px #00D65E' }} />
              {['top-0 left-0 border-t-2 border-l-2', 'top-0 right-0 border-t-2 border-r-2',
                'bottom-0 left-0 border-b-2 border-l-2', 'bottom-0 right-0 border-b-2 border-r-2'].map((cls, i) => (
                <div key={i} className={`absolute w-5 h-5 ${cls}`} style={{ borderColor: '#00D65E' }} />
              ))}
            </div>
            <p className="text-muted-foreground font-medium animate-pulse">Scanning QR Code...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-1">
            {/* App badge + change */}
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
              <button onClick={() => setShowAppSetup(true)} className="text-xs underline underline-offset-2 text-muted-foreground">
                {refreshedSettings.preferredPayApp ? 'Change' : 'Select App'}
              </button>
            </div>

            {/* Merchant card */}
            <div className="flex flex-col items-center justify-center p-5 rounded-2xl" style={inputStyle}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
                style={{ background: 'rgba(0,214,94,0.15)', border: '1px solid rgba(0,214,94,0.3)' }}>
                <Store className="w-7 h-7" style={{ color: '#00D65E' }} />
              </div>
              <h3 className="text-base font-bold text-foreground">{MOCK_MERCHANT.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{MOCK_MERCHANT.upiId}</p>
            </div>

            {/* Amount input */}
            <div className="flex items-center justify-center py-4 rounded-xl" style={inputStyle}>
              <span className="text-2xl text-muted-foreground mr-2 font-display">₹</span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                autoFocus
                className="bg-transparent border-none outline-none w-32 text-4xl text-center font-display font-bold placeholder:text-muted-foreground/30"
              />
            </div>

            {/* Pay button */}
            <button
              onClick={handlePay}
              disabled={!amount || isSubmitting}
              className="w-full py-4 rounded-xl font-bold text-base transition-all active:scale-[0.98] disabled:opacity-40"
              style={{ background: isSubmitting ? 'hsl(222 35% 22%)' : '#00D65E', color: isSubmitting ? '#666' : '#000' }}
            >
              {isSubmitting ? 'Opening...' : `Pay ₹${Number(amount || 0).toLocaleString('en-IN')} via ${appName}`}
            </button>

            <p className="text-center text-[10px] text-muted-foreground -mt-1">
              Opens {appName} · Payment tracked in SmartPay AI
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
