import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp, Zap, Award, AlertCircle } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { getMonthTransactions, getMonthlySpend, getSettings, getSpendForMonth } from '@/lib/storage';

export default function Insights() {
  const transactions = getMonthTransactions();
  const spent = getMonthlySpend();
  const settings = getSettings();
  const budget = settings.monthlyBudget;

  const now = new Date();
  const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const prevSpent = getSpendForMonth(prevMonth, prevYear);

  const topCategory = useMemo(() => {
    const data: Record<string, number> = {};
    transactions.forEach(t => {
      data[t.category] = (data[t.category] || 0) + t.amount;
    });
    const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);
    return sorted[0] || null;
  }, [transactions]);

  const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
  const remaining = Math.max(budget - spent, 0);
  const dailyAllowance = daysLeft > 0 ? Math.floor(remaining / daysLeft) : 0;
  const percentUsed = budget > 0 ? Math.round((spent / budget) * 100) : 0;
  const monthChange = prevSpent > 0 ? Math.round(((spent - prevSpent) / prevSpent) * 100) : null;

  const cardStyle = {
    background: 'hsl(222 40% 12%)',
    border: '1px solid hsl(222 35% 18%)',
    borderRadius: 12,
  };

  const insights = [
    {
      icon: <Zap className="w-5 h-5" style={{ color: '#FFB800' }} />,
      title: 'Daily Allowance',
      value: `₹${dailyAllowance.toLocaleString('en-IN')}`,
      sub: `${daysLeft} days remaining in ${now.toLocaleDateString('en-IN', { month: 'long' })}`,
      color: '#FFB800',
    },
    {
      icon: <Award className="w-5 h-5" style={{ color: '#00D65E' }} />,
      title: 'Budget Used',
      value: `${percentUsed}%`,
      sub: `₹${spent.toLocaleString('en-IN')} of ₹${budget.toLocaleString('en-IN')}`,
      color: percentUsed > 80 ? '#FF4444' : '#00D65E',
    },
    topCategory
      ? {
          icon: <AlertCircle className="w-5 h-5" style={{ color: '#FF4D6D' }} />,
          title: 'Top Spend Category',
          value: topCategory[0],
          sub: `₹${topCategory[1].toLocaleString('en-IN')} spent`,
          color: '#FF4D6D',
        }
      : null,
    monthChange !== null
      ? {
          icon:
            monthChange > 0 ? (
              <TrendingUp className="w-5 h-5" style={{ color: '#FF4444' }} />
            ) : (
              <TrendingDown className="w-5 h-5" style={{ color: '#00D65E' }} />
            ),
          title: 'vs Last Month',
          value: `${monthChange > 0 ? '+' : ''}${monthChange}%`,
          sub:
            monthChange > 0
              ? `Spending up from ₹${prevSpent.toLocaleString('en-IN')}`
              : `Spending down from ₹${prevSpent.toLocaleString('en-IN')}`,
          color: monthChange > 0 ? '#FF4444' : '#00D65E',
        }
      : null,
  ].filter(Boolean) as NonNullable<typeof insights[0]>[];

  const tips = [
    '💡 Set per-category limits in Budget Planner to stay on track.',
    '📊 Review your Dashboard weekly to spot spending patterns.',
    '🎯 Try to keep daily spending under your daily allowance.',
    '🔄 Compare month-on-month in Budget → Compare tab.',
  ];

  return (
    <div className="min-h-screen bg-background pb-24 overflow-y-auto hide-scrollbar">
      <div className="px-5 pt-6 pb-3">
        <h1 className="text-2xl font-bold font-display text-foreground">Insights</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} analysis
        </p>
      </div>

      <div className="px-4 space-y-3">
        {insights.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07 }}
            style={cardStyle}
            className="p-4 flex items-center gap-4"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${item.color}18` }}
            >
              {item.icon}
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">{item.title}</p>
              <p className="text-lg font-bold font-display text-foreground leading-tight">
                {item.value}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>
            </div>
          </motion.div>
        ))}

        {/* AI Tips */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={cardStyle}
          className="p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold text-foreground">SmartPay</span>
            <span
              className="text-xs font-bold px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(0,214,94,0.15)', color: '#00D65E' }}
            >
              AI Tips
            </span>
          </div>
          <ul className="space-y-2">
            {tips.map((tip, i) => (
              <li key={i} className="text-xs text-muted-foreground leading-relaxed">
                {tip}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
}
