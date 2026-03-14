import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import BottomNav from '@/components/BottomNav';
import { getMonthTransactions, getMonthlySpend, getSettings } from '@/lib/storage';

const CAT_COLORS = ['#00D65E', '#00BFDB', '#FFB800', '#FF4D6D', '#B388FF', '#FF8A65', '#4DFFA0'];

export default function Dashboard() {
  const transactions = getMonthTransactions();
  const spent = getMonthlySpend();
  const settings = getSettings();
  const budget = settings.monthlyBudget;

  const categoryData = useMemo(() => {
    const data: Record<string, number> = {};
    transactions.forEach(t => {
      data[t.category] = (data[t.category] || 0) + t.amount;
    });
    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const dailyData = useMemo(() => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const data: Record<number, number> = {};
    for (let i = 1; i <= daysInMonth; i++) data[i] = 0;
    transactions.forEach(t => {
      const day = new Date(t.date).getDate();
      data[day] = (data[day] || 0) + t.amount;
    });
    return Object.entries(data).map(([day, amount]) => ({
      day: `${parseInt(day)} ${new Date(now.getFullYear(), now.getMonth(), parseInt(day)).toLocaleDateString('en-IN', { month: 'short' })}`,
      amount,
    }));
  }, [transactions]);

  const cardStyle = {
    background: 'hsl(222 40% 12%)',
    border: '1px solid hsl(222 35% 18%)',
    borderRadius: 12,
  };

  const tooltipStyle = {
    backgroundColor: 'hsl(222 40% 12%)',
    border: '1px solid hsl(222 35% 22%)',
    borderRadius: 10,
    color: '#fff',
  };

  return (
    <div className="min-h-screen bg-background pb-24 flex flex-col overflow-y-auto hide-scrollbar">
      <div className="px-5 pt-6 pb-3">
        <h1 className="text-2xl font-bold font-display text-foreground">Dashboard</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Your spending overview</p>
      </div>

      <div className="px-4 space-y-4">
        {/* Summary row */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-3"
        >
          <div style={cardStyle} className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Spent</p>
            <p className="text-2xl font-bold font-display text-foreground">
              ₹{spent.toLocaleString('en-IN')}
            </p>
          </div>
          <div style={cardStyle} className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Budget</p>
            <p className="text-2xl font-bold font-display text-foreground">
              ₹{budget.toLocaleString('en-IN')}
            </p>
          </div>
        </motion.div>

        {/* Category Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={cardStyle}
          className="p-4"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4">Category Breakdown</h3>
          {categoryData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No transactions yet</p>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-32 h-32 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={55}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {categoryData.map((_, index) => (
                        <Cell key={index} fill={CAT_COLORS[index % CAT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => `₹${v.toLocaleString('en-IN')}`}
                      contentStyle={tooltipStyle}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {categoryData.map((cat, i) => (
                  <div key={cat.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }}
                      />
                      <span className="text-xs text-foreground">{cat.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground font-semibold">
                      ₹{cat.value.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Daily Spending */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={cardStyle}
          className="p-4"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4">Daily Spending</h3>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 35% 20%)" vertical={false} />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fill: 'hsl(215 20% 55%)' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fill: 'hsl(215 20% 55%)' }}
                />
                <Tooltip
                  formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, 'Spent']}
                  contentStyle={tooltipStyle}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#00D65E"
                  strokeWidth={2}
                  dot={{ fill: '#00D65E', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#00D65E' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
}
