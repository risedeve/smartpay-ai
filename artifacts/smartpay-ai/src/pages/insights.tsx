import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingDown, TrendingUp, Zap, AlertTriangle,
  RefreshCw, Target, Lightbulb, PiggyBank, Flame
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import BottomNav from '@/components/BottomNav';
import {
  getMonthTransactions, getMonthlySpend, getSettings,
  getSpendForMonth, getMonthBudget,
} from '@/lib/storage';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const cardStyle: React.CSSProperties = {
  background: 'hsl(222 40% 12%)',
  border: '1px solid hsl(222 35% 18%)',
  borderRadius: 12,
};

const tooltipStyle = {
  backgroundColor: 'hsl(222 40% 14%)',
  border: '1px solid hsl(222 35% 22%)',
  borderRadius: 10,
  color: '#fff',
  fontSize: 11,
};

export default function Insights() {
  const now = new Date();
  const transactions = getMonthTransactions();
  const spent = getMonthlySpend();
  const settings = getSettings();
  const budget = settings.monthlyBudget;
  const monthBudget = getMonthBudget(now.getMonth(), now.getFullYear());

  const prevM = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const prevY = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const prevSpent = getSpendForMonth(prevM, prevY);

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - now.getDate();
  const remaining = Math.max(budget - spent, 0);
  const dailyAllowance = daysLeft > 0 ? Math.floor(remaining / daysLeft) : 0;
  const percentUsed = budget > 0 ? (spent / budget) * 100 : 0;
  const monthChange = prevSpent > 0 ? ((spent - prevSpent) / prevSpent) * 100 : null;

  // Category spend breakdown
  const catSpend = useMemo(() => {
    const data: Record<string, number> = {};
    transactions.forEach(t => { data[t.category] = (data[t.category] || 0) + t.amount; });
    return Object.entries(data).sort((a, b) => b[1] - a[1]);
  }, [transactions]);

  // Categories over budget
  const overBudgetCats = useMemo(() => {
    return catSpend.filter(([cat, amt]) => {
      const cb = monthBudget.categoryBudgets.find(x => x.category === cat);
      return cb && cb.budget > 0 && amt > cb.budget;
    }).map(([cat, amt]) => {
      const cb = monthBudget.categoryBudgets.find(x => x.category === cat)!;
      return { cat, spent: amt, budget: cb.budget, overBy: amt - cb.budget };
    });
  }, [catSpend, monthBudget]);

  // Repetitive expense detection — same category used 3+ days in a month
  const repetitiveExpenses = useMemo(() => {
    const catDays: Record<string, Set<string>> = {};
    transactions.forEach(t => {
      const day = new Date(t.date).toDateString();
      if (!catDays[t.category]) catDays[t.category] = new Set();
      catDays[t.category].add(day);
    });
    return Object.entries(catDays)
      .filter(([, days]) => days.size >= 3)
      .map(([cat, days]) => ({ cat, days: days.size }))
      .sort((a, b) => b.days - a.days);
  }, [transactions]);

  // Highest single transaction
  const biggestTxn = useMemo(() => {
    return [...transactions].sort((a, b) => b.amount - a.amount)[0] ?? null;
  }, [transactions]);

  // Daily average vs last month
  const dailyAvg = now.getDate() > 0 ? spent / now.getDate() : 0;
  const prevDailyAvg = prevSpent / daysInMonth;

  // 6-month spend trend for chart
  const trendData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { month: MONTH_NAMES[d.getMonth()], spent: getSpendForMonth(d.getMonth(), d.getFullYear()) };
    });
  }, []);

  // Smart saving tips based on actual data
  const smartTips = useMemo(() => {
    const tips: { icon: string; tip: string; severity: 'warn' | 'info' | 'good' }[] = [];

    if (overBudgetCats.length > 0) {
      overBudgetCats.forEach(({ cat, overBy }) => {
        tips.push({ icon: '🚨', tip: `Your ${cat} spending exceeded budget by ₹${overBy.toLocaleString('en-IN')} this month. Try setting a stricter limit.`, severity: 'warn' });
      });
    }

    if (repetitiveExpenses.length > 0) {
      repetitiveExpenses.forEach(({ cat, days }) => {
        tips.push({ icon: '🔁', tip: `You spend on ${cat} almost every day (${days} days this month). Consider buying in bulk to save money.`, severity: 'info' });
      });
    }

    if (monthChange !== null && monthChange > 20) {
      tips.push({ icon: '📈', tip: `Spending rose ${Math.round(monthChange)}% vs last month. Try to identify what changed and cut back.`, severity: 'warn' });
    } else if (monthChange !== null && monthChange < -10) {
      tips.push({ icon: '🎉', tip: `Great job! You spent ${Math.round(Math.abs(monthChange))}% less than last month. Keep it up!`, severity: 'good' });
    }

    if (dailyAvg > prevDailyAvg * 1.15 && prevDailyAvg > 0) {
      tips.push({ icon: '⚡', tip: `Your daily average (₹${Math.round(dailyAvg).toLocaleString('en-IN')}) is higher than last month's (₹${Math.round(prevDailyAvg).toLocaleString('en-IN')}). Slow down spending.`, severity: 'warn' });
    }

    if (percentUsed > 80 && daysLeft > 7) {
      tips.push({ icon: '⚠️', tip: `You've used ${Math.round(percentUsed)}% of your budget with ${daysLeft} days remaining. Limit to ₹${dailyAllowance.toLocaleString('en-IN')}/day.`, severity: 'warn' });
    }

    if (catSpend.length > 0) {
      const top = catSpend[0];
      const pct = Math.round((top[1] / spent) * 100);
      if (pct > 40) {
        tips.push({ icon: '💡', tip: `${top[0]} accounts for ${pct}% of your spending. Try splitting this budget or cutting down.`, severity: 'info' });
      }
    }

    const unbudgetedCats = catSpend.filter(([cat]) => {
      const cb = monthBudget.categoryBudgets.find(x => x.category === cat);
      return !cb || cb.budget === 0;
    });
    if (unbudgetedCats.length > 0) {
      tips.push({ icon: '🎯', tip: `You have spending in ${unbudgetedCats.map(([c]) => c).join(', ')} without a budget set. Allocate budgets to track better.`, severity: 'info' });
    }

    if (tips.length === 0) {
      tips.push({ icon: '✅', tip: 'Looking good! Your spending is within budget. Keep maintaining this pace.', severity: 'good' });
    }

    return tips;
  }, [overBudgetCats, repetitiveExpenses, monthChange, dailyAvg, prevDailyAvg, percentUsed, daysLeft, catSpend, spent, dailyAllowance, monthBudget]);

  const tipColor = (s: 'warn' | 'info' | 'good') =>
    s === 'warn' ? { bg: 'rgba(255,68,68,0.08)', border: 'rgba(255,68,68,0.2)', text: '#FF6666' }
    : s === 'good' ? { bg: 'rgba(0,214,94,0.08)', border: 'rgba(0,214,94,0.2)', text: '#00D65E' }
    : { bg: 'rgba(255,184,0,0.08)', border: 'rgba(255,184,0,0.2)', text: '#FFB800' };

  return (
    <div className="min-h-screen bg-background pb-24 overflow-y-auto hide-scrollbar">
      <div className="px-5 pt-6 pb-3">
        <h1 className="text-2xl font-bold font-display text-foreground">Insights</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} · Smart analysis
        </p>
      </div>

      <div className="px-4 space-y-4">

        {/* KPI row */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-3">
          {[
            { label: 'Daily Allowance', val: `₹${dailyAllowance.toLocaleString('en-IN')}`, sub: `${daysLeft}d left`, icon: <Zap className="w-4 h-4" />, color: '#FFB800' },
            { label: 'Budget Used', val: `${Math.round(percentUsed)}%`, sub: `₹${spent.toLocaleString('en-IN')} spent`, icon: <Target className="w-4 h-4" />, color: percentUsed > 80 ? '#FF4444' : '#00D65E' },
          ].map(({ label, val, sub, icon, color }) => (
            <div key={label} style={cardStyle} className="p-3.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: `${color}18`, color }}>
                {icon}
              </div>
              <p className="text-[10px] text-muted-foreground">{label}</p>
              <p className="text-lg font-bold font-display" style={{ color }}>{val}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
            </div>
          ))}
        </motion.div>

        {/* vs last month */}
        {monthChange !== null && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={cardStyle} className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: monthChange > 0 ? 'rgba(255,68,68,0.12)' : 'rgba(0,214,94,0.12)' }}>
              {monthChange > 0
                ? <TrendingUp className="w-5 h-5" style={{ color: '#FF4444' }} />
                : <TrendingDown className="w-5 h-5" style={{ color: '#00D65E' }} />}
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">vs Last Month</p>
              <p className="text-lg font-bold font-display" style={{ color: monthChange > 0 ? '#FF4444' : '#00D65E' }}>
                {monthChange > 0 ? '+' : ''}{Math.round(monthChange)}%
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {monthChange > 0 ? 'Up' : 'Down'} from ₹{prevSpent.toLocaleString('en-IN')} last month
              </p>
            </div>
          </motion.div>
        )}

        {/* 6-month spend trend */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} style={cardStyle} className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-4 h-4" style={{ color: '#FF4444' }} />
            <p className="text-sm font-semibold text-foreground">6-Month Spend Trend</p>
          </div>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'hsl(215 20% 55%)' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'hsl(215 20% 55%)' }} />
                <Tooltip formatter={(v: number) => `₹${v.toLocaleString('en-IN')}`} contentStyle={tooltipStyle} />
                <Bar dataKey="spent" fill="#00D65E" radius={[4, 4, 0, 0]}
                  label={false}
                  style={{ filter: 'drop-shadow(0 0 4px rgba(0,214,94,0.3))' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Repetitive expenses */}
        {repetitiveExpenses.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={cardStyle} className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <RefreshCw className="w-4 h-4" style={{ color: '#00BFDB' }} />
              <p className="text-sm font-semibold text-foreground">Repetitive Expenses</p>
            </div>
            <div className="space-y-2">
              {repetitiveExpenses.map(({ cat, days }) => (
                <div key={cat} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: 'hsl(222 35% 18%)' }}>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{cat}</p>
                    <p className="text-xs text-muted-foreground">Spent on {days} different days</p>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(0,191,219,0.12)', color: '#00BFDB' }}>
                    {days}× / month
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
              💡 Frequent small purchases add up. Consider bulk-buying or subscription deals.
            </p>
          </motion.div>
        )}

        {/* Over-budget categories */}
        {overBudgetCats.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} style={{ ...cardStyle, border: '1px solid rgba(255,68,68,0.25)' }} className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4" style={{ color: '#FF4444' }} />
              <p className="text-sm font-semibold" style={{ color: '#FF4444' }}>Over Budget</p>
            </div>
            {overBudgetCats.map(({ cat, spent: s, budget: b, overBy }) => (
              <div key={cat} className="mb-3 last:mb-0">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-foreground">{cat}</span>
                  <span style={{ color: '#FF4444' }}>Over by ₹{overBy.toLocaleString('en-IN')}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'hsl(222 35% 20%)' }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min((s / b) * 100, 100)}%`, background: '#FF4444' }} />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>Budget ₹{b.toLocaleString('en-IN')}</span>
                  <span>Spent ₹{s.toLocaleString('en-IN')}</span>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Biggest single transaction */}
        {biggestTxn && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} style={cardStyle} className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,184,0,0.12)' }}>
              <PiggyBank className="w-5 h-5" style={{ color: '#FFB800' }} />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Biggest Transaction</p>
              <p className="text-lg font-bold font-display" style={{ color: '#FFB800' }}>₹{biggestTxn.amount.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{biggestTxn.category} · {new Date(biggestTxn.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
            </div>
          </motion.div>
        )}

        {/* Smart AI Tips */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} style={cardStyle} className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4" style={{ color: '#00D65E' }} />
            <p className="text-sm font-semibold text-foreground">SmartPay</p>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,214,94,0.15)', color: '#00D65E' }}>AI Advice</span>
          </div>
          <div className="space-y-2">
            {smartTips.map((tip, i) => {
              const c = tipColor(tip.severity);
              return (
                <div key={i} className="rounded-xl p-3 text-xs leading-relaxed font-medium" style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
                  {tip.tip}
                </div>
              );
            })}
          </div>
        </motion.div>

      </div>
      <BottomNav />
    </div>
  );
}
