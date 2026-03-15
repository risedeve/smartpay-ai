import { useState, useEffect } from 'react';
import { QrCode, Store, Keyboard } from 'lucide-react';
import {
  addTransaction, getSettings, checkBudgetAlert,
  BudgetAlertInfo, buildPaymentLink,
} from '@/lib/storage';
import BottomSheet from './BottomSheet';
import BudgetAlertModal from './BudgetAlertModal';
import PayAppSetupModal from './PayAppSetupModal';

interface ScanPayModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const APP_COLORS: Record<string, string> = {
  gpay: '#4285F4', phonepe: '#5f259f', paytm: '#00B9F1', upi: '#FF6B00',
};

export default function ScanPayModal({ open, onClose, onSuccess }: ScanPayModalProps) {
  const [step, setStep] = useState<'scan' | 'pay'>('scan');
  const [amount, setAmount] = useState('');
  const [manualUpi, setManualUpi] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<BudgetAlertInfo | null>(null);
  const [showAppSetup, setShowAppSetup] = useState(false);
  const [upiError, setUpiError] = useState('');

  const settings = getSettings();
  const appColor = APP_COLORS[settings.preferredPayApp] || '#00D65E';
  const appName = settings.payAppName || 'UPI App';
  const cat = category || settings.categories[0] || 'Others';

  // Simulated scanned merchant (used when not in manual mode)
  const MOCK_MERCHANT = { name: 'Local Cafe & Store', upiId: 'localcafe@oksbi' };
  const activeUpi = manualMode ? manualUpi : MOCK_MERCHANT.upiId;

  useEffect(() => {
    if (open) {
      setStep('scan');
      setAmount('');
      setManualUpi('');
      setManualMode(false);
      setCategory('');
      setUpiError('');
      const timer = setTimeout(() => setStep('pay'), 2000);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const isValidUpi = (val: string) => {
    if (!val.trim()) return false;
    return /^\d{10}$/.test(val.trim()) || /^[\w.\-+]+@[\w]+$/.test(val.trim());
  };

  const handlePay = () => {
    const s = getSettings();
    if (!s.preferredPayApp) { setShowAppSetup(true); return; }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;
    if (!isValidUpi(activeUpi)) {
      setUpiError('Enter a valid UPI ID or 10-digit mobile number');
      return;
    }

    setUpiError('');
    setIsSubmitting(true);

    addTransaction({
      amount: Number(amount),
      category: cat,
      note: manualMode ? `Payment to ${activeUpi}` : `Payment to ${MOCK_MERCHANT.name}`,
    });

    // Build full payment deep link with UPI ID + amount
    const link = buildPaymentLink(s.preferredPayApp, activeUpi, Number(amount));
    window.location.href = link;

    setTimeout(() => {
      const info = checkBudgetAlert(cat);
      setIsSubmitting(false);
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
      <BottomSheet isOpen={open} onClose={onClose} title={step === 'scan' ? 'Scan QR' : 'Pay'}>
        {step === 'scan' ? (
          <div className="flex flex-col items-center justify-center py-8 min-h-[320px]">
            <div
              className="relative w-52 h-52 rounded-3xl overflow-hidden flex items-center justify-center mb-6"
              style={{ border: '2px solid rgba(0,214,94,0.4)', background: 'hsl(222 40% 10%)' }}
            >
              <QrCode className="w-20 h-20 text-muted-foreground/20" />
              <div
                className="absolute top-0 left-0 w-full h-[2px] animate-scan"
                style={{ background: '#00D65E', boxShadow: '0 0 10px #00D65E' }}
              />
              {[
                'top-0 left-0 border-t-2 border-l-2',
                'top-0 right-0 border-t-2 border-r-2',
                'bottom-0 left-0 border-b-2 border-l-2',
                'bottom-0 right-0 border-b-2 border-r-2',
              ].map((cls, i) => (
                <div key={i} className={`absolute w-6 h-6 ${cls}`} style={{ borderColor: '#00D65E' }} />
              ))}
            </div>
            <p className="text-sm text-muted-foreground font-medium animate-pulse mb-4">Scanning QR Code...</p>
            <button
              onClick={() => { setManualMode(true); setStep('pay'); }}
              className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl"
              style={{ background: 'hsl(222 40% 16%)', color: 'hsl(215 20% 65%)' }}
            >
              <Keyboard className="w-3.5 h-3.5" />
              Enter UPI ID manually instead
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-1">
            {/* App badge */}
            <div className="flex items-center justify-between">
              {settings.preferredPayApp ? (
                <div
                  className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full font-semibold"
                  style={{ background: `${appColor}15`, color: appColor, border: `1px solid ${appColor}30` }}
                >
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

            {/* Merchant card or manual UPI input */}
            {manualMode ? (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pay to</label>
                <input
                  type="text"
                  value={manualUpi}
                  onChange={e => { setManualUpi(e.target.value); setUpiError(''); }}
                  placeholder="UPI ID (name@bank) or Mobile number"
                  autoFocus
                  className="w-full px-4 py-3 text-sm text-foreground rounded-xl outline-none"
                  style={{ ...inputStyle, border: upiError ? '1px solid #FF4444' : '1px solid hsl(222 35% 22%)' }}
                />
                {upiError && <p className="text-xs" style={{ color: '#FF4444' }}>{upiError}</p>}
                {manualUpi && isValidUpi(manualUpi) && (
                  <p className="text-xs" style={{ color: '#00D65E' }}>
                    {/^\d{10}$/.test(manualUpi.trim()) ? '✓ Mobile number' : '✓ UPI ID'}
                  </p>
                )}
                <button
                  onClick={() => setManualMode(false)}
                  className="text-xs text-muted-foreground underline underline-offset-2"
                >
                  Use scanned QR instead
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4 p-4 rounded-2xl" style={inputStyle}>
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(0,214,94,0.15)', border: '1px solid rgba(0,214,94,0.3)' }}
                >
                  <Store className="w-6 h-6" style={{ color: '#00D65E' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">{MOCK_MERCHANT.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{MOCK_MERCHANT.upiId}</p>
                </div>
                <button
                  onClick={() => setManualMode(true)}
                  className="text-[10px] font-semibold px-2 py-1 rounded-lg"
                  style={{ background: 'hsl(222 35% 22%)', color: 'hsl(215 20% 65%)' }}
                >
                  Change
                </button>
              </div>
            )}

            {/* Amount */}
            <div className="flex items-center justify-center py-4 rounded-xl" style={inputStyle}>
              <span className="text-2xl text-muted-foreground mr-2 font-display">₹</span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                autoFocus={manualMode && !!manualUpi}
                className="bg-transparent border-none outline-none w-32 text-4xl text-center font-display font-bold placeholder:text-muted-foreground/30"
              />
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
              Logs the payment · Opens {appName} to complete it
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
