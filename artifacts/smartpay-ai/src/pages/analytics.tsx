import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import BottomNav from '@/components/BottomNav';
import { getMonthTransactions, getMonthlySpend, getSettings } from '@/lib/storage';

const COLORS = ['#6C63FF', '#00E5FF', '#FF4D4D', '#FFB800', '#00C853', '#B388FF', '#FF8A65'];

export default function Analytics() {
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
    const data: Record<string, number> = {};
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    
    // Initialize all days
    for (let i = 1; i <= daysInMonth; i++) {
      data[i] = 0;
    }
    
    transactions.forEach(t => {
      const day = new Date(t.date).getDate();
      data[day] += t.amount;
    });
    
    return Object.entries(data).map(([day, amount]) => ({
      day: parseInt(day),
      amount
    }));
  }, [transactions]);

  const topCategory = categoryData[0]?.name || 'N/A';
  const averageDaily = spent / new Date().getDate();

  return (
    <div className="min-h-screen bg-background pb-24 flex flex-col">
      <div className="px-5 pt-8 pb-2">
        <h1 className="text-2xl font-bold font-display text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground">Insights for {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
      </div>

      <div className="flex-1 px-5 mt-4 space-y-6 overflow-y-auto hide-scrollbar">
        
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-4">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Total Spent</span>
            <span className="text-xl font-bold font-display text-foreground">₹{spent.toLocaleString('en-IN')}</span>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl p-4">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">Daily Avg</span>
            <span className="text-xl font-bold font-display text-foreground">₹{Math.round(averageDaily).toLocaleString('en-IN')}</span>
          </motion.div>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground text-sm glass rounded-2xl">
            Not enough data to generate charts.
          </div>
        ) : (
          <>
            {/* Category Pie Chart */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="glass rounded-3xl p-5 border border-primary/10 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
              <h3 className="text-sm font-bold text-foreground mb-4">Spending by Category</h3>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {categoryData.map((cat, i) => (
                  <div key={cat.name} className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground bg-secondary/50 px-2 py-1 rounded-md">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    {cat.name}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Daily Bar Chart */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="glass rounded-3xl p-5 border border-accent/10 relative overflow-hidden">
               <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
              <h3 className="text-sm font-bold text-foreground mb-6">Daily Breakdown</h3>
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyData}>
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip 
                      cursor={{ fill: 'hsl(var(--secondary))' }}
                      formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`}
                      labelFormatter={(label) => `Day ${label}`}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }}
                    />
                    <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
