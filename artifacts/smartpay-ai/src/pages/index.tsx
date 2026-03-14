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
  const [, setRefresh] = useState(0);
  const [isReady, setIsReady] = useState(false);
  
  const settings = getSettings();
  const [onboarded, setOnboarded] = useState(settings.onboarded);

  useEffect(() => {
    setIsReady(true);
  }, []);

  const forceRefresh = useCallback(() => setRefresh(v => v + 1), []);

  if (!isReady) return null;

  if (!onboarded) {
    return <OnboardingModal onComplete={() => {
      setOnboarded(true);
      forceRefresh();
    }} />;
  }

  const spent = getMonthlySpend();
  const recentTxns = getMonthTransactions().slice(0, 3);

  return (
    <div className="min-h-screen bg-background pb-24 flex flex-col">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="px-6 pt-8 pb-4">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Welcome back</p>
        <h1 className="text-3xl font-bold font-display text-foreground mt-1">SmartPay <span className="text-gradient">AI</span></h1>
      </motion.div>

      <SmartBanner />

      {/* Budget Ring */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="flex justify-center py-6">
        <BudgetRing spent={spent} budget={settings.monthlyBudget} />
      </motion.div>

      {/* Pay & Scan Buttons */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-col items-center gap-6 py-4">
        <PayButton onClick={() => setPayOpen(true)} />
        
        <button
          onClick={() => setScanOpen(true)}
          className="flex items-center gap-2 px-6 py-3.5 rounded-full bg-secondary text-foreground font-medium text-sm hover:bg-secondary/80 transition-all border border-border/50 active:scale-95"
        >
          <ScanLine className="w-5 h-5 text-accent" />
          Scan & Pay QR
        </button>
      </motion.div>

      {/* Recent Transactions */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="px-5 mt-6 flex-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Recent Activity</h3>
          <Link href="/history" className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
            See All
          </Link>
        </div>
        
        {recentTxns.length === 0 ? (
          <div className="glass rounded-2xl p-6 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center mb-3">
              <span className="text-xl">💸</span>
            </div>
            <p className="text-muted-foreground text-sm">No transactions yet.<br/>Tap PAY to track your first expense!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentTxns.map(t => (
              <div key={t.id} className="glass rounded-2xl p-4 flex items-center justify-between active:scale-[0.98] transition-transform">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground font-semibold text-sm border border-white/5">
                    {t.category.substring(0,2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{t.category}</p>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">
                      {new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} • {t.note || 'No note'}
                    </p>
                  </div>
                </div>
                <span className="text-base font-bold text-foreground font-display">-₹{t.amount.toLocaleString('en-IN')}</span>
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
