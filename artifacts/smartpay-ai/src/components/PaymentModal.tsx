import { useState } from 'react';
import { addTransaction, getSettings, checkBudgetAlert, BudgetAlertInfo } from '@/lib/storage';
import BottomSheet from './BottomSheet';
import BudgetAlertModal from './BudgetAlertModal';

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
  const [alert, setAlert] = useState<BudgetAlertInfo | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;
    setIsSubmitting(true);

    setTimeout(() => {
      addTransaction({ amount: Number(amount), category, note });
      const info = checkBudgetAlert(category);
      setIsSubmitting(false);
      setAmount('');
      setNote('');
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
      <BottomSheet isOpen={open} onClose={onClose} title="New Payment">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* Amount */}
          <div
            className="flex flex-col items-center justify-center py-6 rounded-2xl"
            style={inputStyle}
          >
            <span className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wider">Amount</span>
            <div className="flex items-center text-5xl font-display font-bold text-foreground">
              <span className="text-3xl text-muted-foreground mr-1">₹</span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                autoFocus
                className="bg-transparent border-none outline-none w-full max-w-[200px] text-center placeholder:text-muted-foreground/30 hide-scrollbar"
                style={{ MozAppearance: 'textfield' } as React.CSSProperties}
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {settings.categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className="py-2 px-3 rounded-xl text-xs font-semibold transition-all active:scale-95"
                  style={
                    category === cat
                      ? { background: '#00D65E', color: '#000' }
                      : { background: 'hsl(222 35% 18%)', color: 'hsl(215 20% 65%)' }
                  }
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Note (Optional)</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="What was this for?"
              className="w-full px-4 py-3 text-sm text-foreground rounded-xl outline-none transition-all"
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={!amount || isSubmitting}
            className="mt-2 w-full py-4 rounded-xl text-black font-bold text-lg transition-all active:scale-[0.98] disabled:opacity-40"
            style={{ background: isSubmitting ? 'hsl(222 35% 22%)' : '#00D65E' }}
          >
            {isSubmitting ? 'Processing...' : 'Pay Now'}
          </button>
        </form>
      </BottomSheet>

      {/* Budget alert shown after payment */}
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
