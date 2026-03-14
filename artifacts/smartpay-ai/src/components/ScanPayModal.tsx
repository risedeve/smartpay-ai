import { useState, useEffect } from 'react';
import { QrCode, Store } from 'lucide-react';
import { addTransaction, getSettings } from '@/lib/storage';
import BottomSheet from './BottomSheet';

interface ScanPayModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ScanPayModal({ open, onClose, onSuccess }: ScanPayModalProps) {
  const [step, setStep] = useState<'scan' | 'pay'>('scan');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const settings = getSettings();

  useEffect(() => {
    if (open) {
      setStep('scan');
      setAmount('');
      // Simulate scanning process
      const timer = setTimeout(() => {
        setStep('pay');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;
    
    setIsSubmitting(true);
    setTimeout(() => {
      addTransaction({
        amount: Number(amount),
        category: 'Food', // Default guess for merchant
        note: 'Payment to Local Store'
      });
      setIsSubmitting(false);
      onSuccess();
      onClose();
    }, 600);
  };

  return (
    <BottomSheet isOpen={open} onClose={onClose} title={step === 'scan' ? 'Scan QR' : 'Pay Merchant'}>
      {step === 'scan' ? (
        <div className="flex flex-col items-center justify-center py-10 min-h-[300px]">
          <div className="relative w-48 h-48 border-2 border-primary/50 rounded-3xl overflow-hidden flex items-center justify-center mb-6 bg-secondary/20">
            <QrCode className="w-20 h-20 text-muted-foreground/30" />
            <div className="absolute top-0 left-0 w-full h-[2px] bg-accent animate-scan shadow-[0_0_8px_#00E5FF]" />
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary" />
          </div>
          <p className="text-muted-foreground font-medium animate-pulse">Scanning QR Code...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 py-2">
          
          <div className="flex flex-col items-center justify-center p-6 bg-secondary/40 rounded-2xl border border-white/5">
            <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-3 border border-primary/30">
              <Store className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Local Cafe & Store</h3>
            <p className="text-sm text-muted-foreground">UPI ID: store@upi</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-center py-4 bg-background rounded-xl border border-border focus-within:border-primary/50 transition-colors">
              <span className="text-2xl text-muted-foreground mr-2 font-display">₹</span>
              <input 
                type="number" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                autoFocus
                className="bg-transparent border-none outline-none w-32 text-4xl text-center font-display font-bold placeholder:text-muted-foreground/30"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!amount || isSubmitting}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-white font-bold text-lg shadow-[0_4px_20px_rgba(108,99,255,0.4)] disabled:opacity-50 disabled:shadow-none transition-all active:scale-[0.98] mt-2"
          >
            {isSubmitting ? 'Processing...' : 'Send Money'}
          </button>
        </form>
      )}
    </BottomSheet>
  );
}
