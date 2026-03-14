import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, PiggyBank, ArrowRight, X } from 'lucide-react';
import { useLocation } from 'wouter';

export type BudgetAlertType = 'over_budget' | 'no_budget';

interface BudgetAlertModalProps {
  open: boolean;
  onClose: () => void;
  type: BudgetAlertType;
  category: string;
  spent?: number;
  budget?: number;
}

export default function BudgetAlertModal({
  open,
  onClose,
  type,
  category,
  spent,
  budget,
}: BudgetAlertModalProps) {
  const [, navigate] = useLocation();

  const isOverBudget = type === 'over_budget';

  const overBy = isOverBudget && spent !== undefined && budget !== undefined
    ? spent - budget
    : 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] max-w-[420px] mx-auto"
            style={{ background: 'rgba(5, 8, 16, 0.85)', backdropFilter: 'blur(6px)' }}
          />

          {/* Alert card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 40 }}
            transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[70] max-w-[380px] mx-auto rounded-2xl overflow-hidden"
            style={{
              background: 'hsl(222 40% 12%)',
              border: isOverBudget
                ? '1px solid rgba(255, 68, 68, 0.4)'
                : '1px solid rgba(255, 184, 0, 0.4)',
              boxShadow: isOverBudget
                ? '0 0 40px rgba(255,68,68,0.2), 0 20px 60px rgba(0,0,0,0.6)'
                : '0 0 40px rgba(255,184,0,0.2), 0 20px 60px rgba(0,0,0,0.6)',
            }}
          >
            {/* Top glow bar */}
            <div
              className="h-1 w-full"
              style={{
                background: isOverBudget
                  ? 'linear-gradient(90deg, #FF4444, #FF8888)'
                  : 'linear-gradient(90deg, #FFB800, #FFD770)',
              }}
            />

            <div className="p-6">
              {/* Close */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 rounded-full transition-colors"
                style={{ background: 'hsl(222 35% 18%)' }}
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>

              {/* Icon */}
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{
                  background: isOverBudget
                    ? 'rgba(255,68,68,0.12)'
                    : 'rgba(255,184,0,0.12)',
                }}
              >
                {isOverBudget ? (
                  <AlertTriangle
                    className="w-7 h-7"
                    style={{ color: '#FF4444' }}
                    strokeWidth={2.5}
                  />
                ) : (
                  <PiggyBank
                    className="w-7 h-7"
                    style={{ color: '#FFB800' }}
                    strokeWidth={2}
                  />
                )}
              </div>

              {/* Title */}
              <h2
                className="text-lg font-bold font-display mb-1"
                style={{ color: isOverBudget ? '#FF4444' : '#FFB800' }}
              >
                {isOverBudget ? '⚠️ Going Over Budget!' : '💡 No Budget Set!'}
              </h2>

              {/* Message */}
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {isOverBudget ? (
                  <>
                    Hey! Your <span className="text-foreground font-semibold">{category}</span> spending
                    has exceeded your budget
                    {overBy > 0 && (
                      <>
                        {' '}by{' '}
                        <span style={{ color: '#FF4444' }} className="font-bold">
                          ₹{overBy.toLocaleString('en-IN')}
                        </span>
                      </>
                    )}
                    . Consider reviewing your budget allocation.
                  </>
                ) : (
                  <>
                    Hey! You made a payment under{' '}
                    <span className="text-foreground font-semibold">{category}</span>{' '}
                    but haven't set a budget for it yet. Allocate one to track your spending better!
                  </>
                )}
              </p>

              {/* Stats row for over-budget */}
              {isOverBudget && spent !== undefined && budget !== undefined && (
                <div
                  className="flex justify-between rounded-xl p-3 mb-4 text-sm"
                  style={{ background: 'hsl(222 35% 16%)' }}
                >
                  <div className="text-center flex-1">
                    <p className="text-xs text-muted-foreground mb-0.5">Budget</p>
                    <p className="font-bold text-foreground">₹{budget.toLocaleString('en-IN')}</p>
                  </div>
                  <div
                    className="w-px"
                    style={{ background: 'hsl(222 35% 22%)' }}
                  />
                  <div className="text-center flex-1">
                    <p className="text-xs text-muted-foreground mb-0.5">Spent</p>
                    <p className="font-bold" style={{ color: '#FF4444' }}>
                      ₹{spent.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div
                    className="w-px"
                    style={{ background: 'hsl(222 35% 22%)' }}
                  />
                  <div className="text-center flex-1">
                    <p className="text-xs text-muted-foreground mb-0.5">Over by</p>
                    <p className="font-bold" style={{ color: '#FF4444' }}>
                      ₹{overBy.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: 'hsl(222 35% 18%)',
                    color: 'hsl(215 20% 65%)',
                  }}
                >
                  Dismiss
                </button>
                <button
                  onClick={() => {
                    onClose();
                    navigate('/budget');
                  }}
                  className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                  style={{
                    background: isOverBudget
                      ? 'rgba(255,68,68,0.15)'
                      : 'rgba(255,184,0,0.15)',
                    color: isOverBudget ? '#FF4444' : '#FFB800',
                    border: isOverBudget
                      ? '1px solid rgba(255,68,68,0.3)'
                      : '1px solid rgba(255,184,0,0.3)',
                  }}
                >
                  {isOverBudget ? 'Review Budget' : 'Set Budget'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
