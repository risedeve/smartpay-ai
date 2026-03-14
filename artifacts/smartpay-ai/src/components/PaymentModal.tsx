import { useState } from 'react';
import { addTransaction, getSettings } from '@/lib/storage';
import BottomSheet from './BottomSheet';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PaymentModal({ open, onClose, onSuccess }: PaymentModalProps) {
  const settings = getSettings();
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(settings.categories[0] || 'Others');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;

    setIsSubmitting(true);
    
    // Simulate network delay for better UX
    setTimeout(() => {
      addTransaction({
        amount: Number(amount),
        category,
        note
      });
      setIsSubmitting(false);
      setAmount('');
      setNote('');
      onSuccess();
      onClose();
    }, 600);
  };

  return (
    <BottomSheet isOpen={open} onClose={onClose} title="New Payment">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        
        <div className="flex flex-col items-center justify-center py-6 bg-secondary/30 rounded-2xl border border-white/5">
          <span className="text-muted-foreground text-sm font-medium mb-2">Amount</span>
          <div className="flex items-center text-5xl font-display font-bold text-foreground">
            <span className="text-3xl text-muted-foreground mr-1">₹</span>
            <input 
              type="number" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              autoFocus
              className="bg-transparent border-none outline-none w-full max-w-[200px] text-center placeholder:text-muted-foreground/30 hide-scrollbar"
              style={{ MozAppearance: 'textfield' }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Category</label>
          <div className="grid grid-cols-3 gap-2">
            {settings.categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`py-2 px-3 rounded-xl text-xs font-medium transition-all ${
                  category === cat 
                    ? 'bg-primary text-white shadow-[0_0_10px_rgba(108,99,255,0.3)]' 
                    : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Add Note (Optional)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What was this for?"
            className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={!amount || isSubmitting}
          className="mt-4 w-full py-4 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold text-lg shadow-lg shadow-primary/25 disabled:opacity-50 disabled:grayscale transition-all active:scale-[0.98]"
        >
          {isSubmitting ? 'Processing...' : 'Pay Now'}
        </button>
      </form>
    </BottomSheet>
  );
}
