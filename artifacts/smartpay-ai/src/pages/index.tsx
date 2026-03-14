import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ScanLine } from 'lucide-react';
import { Link } from 'wouter';
import PayButton from '@/components/PayButton';
import PaymentModal from '@/components/PaymentModal';
import ScanPayModal from '@/components/ScanPayModal';
import BudgetRing from '@/components/BudgetRing';
import SmartBanner from '@/components/SmartBanner';
import OnboardingModal from '@/components/OnboardingModal';
import BottomNav from '@/components/BottomNav';
import { getSettings, getMonthlySpend, getMonthTransactions } from '@/lib/storage';

export default function Index() {
  const [payOpen, setPayOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [isReady, setIsReady] = useState(false);

  const settings = getSettings();
  const [onboarded, setOnboarded] = useState(settings.onboarded);

  useEffect(() => {
    setIsReady(true);
  }, []);

  const forceRefresh = useCallback(() => setRefresh(v => v + 1), []);

  if (!isReady) return null;

  if (!onboarded) {
    return (
      <OnboardingModal
        onComplete={() => {
          setOnboarded(true);
          forceRefresh();
        }}
      />
    );
  }

  const spent = getMonthlySpend();
  const monthTxns = getMonthTransactions();
  const recentTxns = monthTxns.slice(0, 5);
  const paymentCount = monthTxns.length;

  return (
    <div className="min-h-screen bg-background pb-24 flex flex-col overflow-y-auto hide-scrollbar">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-5 pt-6 pb-2"
      >
        <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase">Welcome back</p>
        <h1 className="text-2xl font-bold font-display text-foreground mt-0.5">
          SmartPay <span className="text-gradient">AI</span>
        </h1>
      </motion.div>

      <SmartBanner key={refresh} />

      {/* Budget Ring */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="flex justify-center py-4"
      >
        <BudgetRing spent={spent} budget={settings.monthlyBudget} />
      </motion.div>

      {/* Pay Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col items-center gap-4 py-2"
      >
        <PayButton onClick={() => setPayOpen(true)} />

        <button
          onClick={() => setScanOpen(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-foreground font-medium text-sm transition-all border active:scale-95"
          style={{ background: 'hsl(222 40% 16%)', borderColor: 'hsl(222 35% 22%)' }}
        >
          <ScanLine className="w-4 h-4" style={{ color: '#00D65E' }} />
          Scan &amp; Pay
        </button>
      </motion.div>

      {/* Payment count stat */}
      {paymentCount > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="flex justify-center mt-2"
        >
          <div
            className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: 'rgba(0,214,94,0.12)', color: '#00D65E', border: '1px solid rgba(0,214,94,0.25)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D65E]" />
            {paymentCount} payment{paymentCount !== 1 ? 's' : ''} made this month
          </div>
        </motion.div>
      )}

      {/* Recent Transactions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="px-4 mt-4 flex-1"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Recent Transactions</h3>
          <Link
            href="/history"
            className="text-xs font-semibold transition-colors"
            style={{ color: '#00D65E' }}
          >
            See All
          </Link>
        </div>

        {recentTxns.length === 0 ? (
          <div className="glass rounded-xl p-5 text-center text-muted-foreground text-sm">
            No transactions yet. Tap PAY to get started!
          </div>
        ) : (
          <div className="space-y-2">
            {recentTxns.map(t => (
              <div key={t.id} className="glass rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.category}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(t.date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                    {', '}
                    {new Date(t.date).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </p>
                </div>
                <span className="text-sm font-bold" style={{ color: '#FF4444' }}>
                  -₹{t.amount.toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      <PaymentModal open={payOpen} onClose={() => setPayOpen(false)} onSuccess={forceRefresh} />
      <ScanPayModal open={scanOpen} onClose={() => setScanOpen(false)} onSuccess={forceRefresh} />
      <BottomNav />
    </div>
  );
}
