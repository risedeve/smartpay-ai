import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ScanLine } from 'lucide-react';
import PayButton from '@/components/PayButton';
import PaymentModal from '@/components/PaymentModal';
import ScanPayModal from '@/components/ScanPayModal';
import BudgetRing from '@/components/BudgetRing';
import SmartBanner from '@/components/SmartBanner';
import OnboardingModal from '@/components/OnboardingModal';
import BottomNav from '@/components/BottomNav';
import { getSettings, getMonthlySpend, getMonthTransactions } from '@/lib/storage';

const Index = () => {
  const [payOpen, setPayOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [, setRefresh] = useState(0);
  const settings = getSettings();
  const [onboarded, setOnboarded] = useState(settings.onboarded);

  const forceRefresh = useCallback(() => setRefresh(v => v + 1), []);

  const spent = getMonthlySpend();
  const recentTxns = getMonthTransactions().slice(0, 3);

  if (!onboarded) {
    return <OnboardingModal onComplete={() => setOnboarded(true)} />;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="px-5 pt-6 pb-4">
        <p className="text-sm text-muted-foreground">Welcome back</p>
        <h1 className="text-2xl font-bold text-foreground">SmartPay <span className="text-gradient">AI</span></h1>
      </motion.div>

      <SmartBanner />

      {/* Budget Ring */}
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="flex justify-center py-4">
        <BudgetRing spent={spent} budget={settings.monthlyBudget} />
      </motion.div>

      {/* Pay & Scan Buttons */}
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="flex flex-col items-center gap-4 py-6">
        <PayButton onClick={() => setPayOpen(true)} />
        <motion.button
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.03 }}
          onClick={() => setScanOpen(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-secondary text-foreground font-medium text-sm hover:bg-secondary/80 transition-colors border border-border/50"
        >
          <ScanLine className="w-5 h-5 text-accent" />
          Scan & Pay
        </motion.button>
      </motion.div>

      {/* Recent Transactions */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="px-5 mt-2">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">Recent Transactions</h3>
        {recentTxns.length === 0 ? (
          <div className="glass rounded-xl p-4 text-center text-muted-foreground text-sm">
            No transactions yet. Tap PAY to get started!
          </div>
        ) : (
          <div className="space-y-2">
            {recentTxns.map(t => (
              <div key={t.id} className="glass rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{t.category}</p>
                  <p className="text-xs text-muted-foreground">{new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <span className="text-sm font-bold text-destructive">-₹{t.amount.toLocaleString('en-IN')}</span>
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
};

export default Index;
