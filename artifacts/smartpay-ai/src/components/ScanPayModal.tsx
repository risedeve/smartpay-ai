import { useState, useEffect } from 'react';
import { QrCode, Store } from 'lucide-react';
import { addTransaction, getSettings, checkBudgetAlert, BudgetAlertInfo } from '@/lib/storage';
import BottomSheet from './BottomSheet';
import BudgetAlertModal from './BudgetAlertModal';

interface ScanPayModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ScanPayModal({ open, onClose, onSuccess }: ScanPayModalProps) {
  const [step, setStep] = useState<'scan' | 'pay'>('scan');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<BudgetAlertInfo | null>(null);
  const settings = getSettings();
  const defaultCategory = 'Food';

  useEffect(() => {
    if (open) {
      setStep('scan');
      setAmount('');
      const timer = setTimeout(() => setStep('pay'), 2000);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;
    setIsSubmitting(true);

    setTimeout(() => {
      addTransaction({ amount: Number(amount), category: defaultCategory, note: 'Payment to Local Store' });
      const info = checkBudgetAlert(defaultCategory);
      setIsSubmitting(false);
      onSuccess();
      onClose();
      if (info.kind !== 'none') {
        setAlert(info);
      }
    }, 600);
  };

  const inputStyle = {
    background: 'hsl(222 40% 16%)',
    border: '1px solid hsl(222 35% 22%)',
  };

  return (
    <>
      <BottomSheet isOpen={open} onClose={onClose} title={step === 'scan' ? 'Scan QR' : 'Pay Merchant'}>
        {step === 'scan' ? (
          <div className="flex flex-col items-center justify-center py-10 min-h-[300px]">
            <div
              className="relative w-48 h-48 rounded-3xl overflow-hidden flex items-center justify-center mb-6"
              style={{ border: '2px solid rgba(0,214,94,0.4)', background: 'hsl(222 40% 10%)' }}
            >
              <QrCode className="w-20 h-20 text-muted-foreground/30" />
              <div
                className="absolute top-0 left-0 w-full h-[2px] animate-scan"
                style={{ background: '#00D65E', boxShadow: '0 0 8px #00D65E' }}
              />
              {/* Corner brackets */}
              {['top-0 left-0 border-t-2 border-l-2', 'top-0 right-0 border-t-2 border-r-2',
                'bottom-0 left-0 border-b-2 border-l-2', 'bottom-0 right-0 border-b-2 border-r-2'].map((cls, i) => (
                <div key={i} className={`absolute w-5 h-5 ${cls}`} style={{ borderColor: '#00D65E' }} />
              ))}
            </div>
            <p className="text-muted-foreground font-medium animate-pulse">Scanning QR Code...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5 py-2">
            <div
              className="flex flex-col items-center justify-center p-5 rounded-2xl"
              style={inputStyle}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
                style={{ background: 'rgba(0,214,94,0.15)', border: '1px solid rgba(0,214,94,0.3)' }}
              >
                <Store className="w-7 h-7" style={{ color: '#00D65E' }} />
              </div>
              <h3 className="text-base font-bold text-foreground">Local Cafe &amp; Store</h3>
              <p className="text-xs text-muted-foreground mt-0.5">UPI ID: store@upi</p>
            </div>

            <div
              className="flex items-center justify-center py-4 rounded-xl"
              style={inputStyle}
            >
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

            <button
              type="submit"
              disabled={!amount || isSubmitting}
              className="w-full py-4 rounded-xl text-black font-bold text-lg transition-all active:scale-[0.98] disabled:opacity-40 mt-2"
              style={{ background: isSubmitting ? 'hsl(222 35% 22%)' : '#00D65E' }}
            >
              {isSubmitting ? 'Processing...' : 'Send Money'}
            </button>
          </form>
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
    </>
  );
}
