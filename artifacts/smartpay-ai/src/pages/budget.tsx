import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Download, ArrowLeftRight, CircleDollarSign } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import BottomNav from '@/components/BottomNav';
import {
  getSettings,
  getMonthBudget,
  saveMonthBudget,
  getSpendForMonth,
  getTransactionsByMonth,
} from '@/lib/storage';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function Budget() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [tab, setTab] = useState<'budget' | 'compare'>('budget');
  const settings = getSettings();

  const monthBudget = getMonthBudget(selectedMonth, selectedYear);
  const [totalBudget, setTotalBudget] = useState(monthBudget.totalBudget);
  const [catBudgets, setCatBudgets] = useState<Record<string, number>>(
    Object.fromEntries(monthBudget.categoryBudgets.map(c => [c.category, c.budget]))
  );

  const categorySpends = useMemo(() => {
    const txns = getTransactionsByMonth(selectedMonth, selectedYear);
    const data: Record<string, number> = {};
    settings.categories.forEach(c => (data[c] = 0));
    txns.forEach(t => {
      data[t.category] = (data[t.category] || 0) + t.amount;
    });
    return data;
  }, [selectedMonth, selectedYear, settings.categories]);

  const totalSpent = getSpendForMonth(selectedMonth, selectedYear);

  const handleSave = () => {
    saveMonthBudget(selectedMonth, selectedYear, {
      totalBudget,
      categoryBudgets: settings.categories.map(c => ({
        category: c,
        budget: catBudgets[c] || 0,
      })),
    });
  };

  const compareData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(selectedYear, selectedMonth - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const b = getMonthBudget(m, y);
      const s = getSpendForMonth(m, y);
      return {
        name: MONTH_NAMES[m].slice(0, 3),
        Budget: b.totalBudget,
        Spent: s,
      };
    }).reverse();
  }, [selectedMonth, selectedYear]);

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  const cardStyle = {
    background: 'hsl(222 40% 12%)',
    border: '1px solid hsl(222 35% 18%)',
    borderRadius: 12,
  };

  const inputStyle = {
    background: 'hsl(222 40% 16%)',
    border: '1px solid hsl(222 35% 22%)',
    borderRadius: 10,
    color: '#fff',
    padding: '10px 14px',
    fontSize: 16,
    width: '100%',
    outline: 'none',
  };

  const tooltipStyle = {
    backgroundColor: 'hsl(222 40% 12%)',
    border: '1px solid hsl(222 35% 22%)',
    borderRadius: 10,
    color: '#fff',
  };

  return (
    <div className="min-h-screen bg-background pb-24 overflow-y-auto hide-scrollbar">
      {/* Header */}
      <div className="px-5 pt-6 pb-3 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Budget Planner</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Plan &amp; compare your budgets</p>
        </div>
        <button
          onClick={handleSave}
          className="p-2.5 rounded-xl"
          style={{ background: 'hsl(222 40% 18%)' }}
          title="Save budget"
        >
          <Download className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="px-4 space-y-4">
        {/* Month / Year selectors */}
        <div className="flex gap-3">
          <select
            value={selectedMonth}
            onChange={e => {
              const m = parseInt(e.target.value);
              setSelectedMonth(m);
              const b = getMonthBudget(m, selectedYear);
              setTotalBudget(b.totalBudget);
              setCatBudgets(Object.fromEntries(b.categoryBudgets.map(c => [c.category, c.budget])));
            }}
            className="flex-1 px-3 py-2.5 text-sm rounded-xl text-foreground"
            style={{ background: 'hsl(222 40% 12%)', border: '1px solid hsl(222 35% 22%)', outline: 'none' }}
          >
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={e => {
              const y = parseInt(e.target.value);
              setSelectedYear(y);
              const b = getMonthBudget(selectedMonth, y);
              setTotalBudget(b.totalBudget);
              setCatBudgets(Object.fromEntries(b.categoryBudgets.map(c => [c.category, c.budget])));
            }}
            className="px-3 py-2.5 text-sm rounded-xl text-foreground"
            style={{ background: 'hsl(222 40% 12%)', border: '1px solid hsl(222 35% 22%)', outline: 'none' }}
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Tab toggle */}
        <div
          className="flex rounded-xl overflow-hidden"
          style={{ background: 'hsl(222 40% 12%)', border: '1px solid hsl(222 35% 18%)' }}
        >
          <button
            onClick={() => setTab('budget')}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-all rounded-xl"
            style={
              tab === 'budget'
                ? { background: '#00D65E', color: '#000' }
                : { color: 'hsl(215 20% 55%)' }
            }
          >
            <CircleDollarSign className="w-4 h-4" />
            Budget
          </button>
          <button
            onClick={() => setTab('compare')}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-all rounded-xl"
            style={
              tab === 'compare'
                ? { background: '#00D65E', color: '#000' }
                : { color: 'hsl(215 20% 55%)' }
            }
          >
            <ArrowLeftRight className="w-4 h-4" />
            Compare
          </button>
        </div>

        {tab === 'budget' ? (
          <>
            {/* Total Budget */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={cardStyle}
              className="p-4"
            >
              <p className="text-xs text-muted-foreground mb-2">Total Monthly Budget</p>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-lg">₹</span>
                <input
                  type="number"
                  value={totalBudget}
                  onChange={e => setTotalBudget(Number(e.target.value))}
                  onBlur={handleSave}
                  style={{ ...inputStyle, background: 'transparent', border: 'none', padding: '0', fontSize: 20, fontWeight: 700 }}
                />
              </div>
            </motion.div>

            {/* Category Allocation */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Category Allocation</h3>
              <div className="space-y-3">
                {settings.categories.map((cat, i) => {
                  const spent = categorySpends[cat] || 0;
                  return (
                    <motion.div
                      key={cat}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      style={cardStyle}
                      className="p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-foreground">{cat}</span>
                        <span className="text-xs text-muted-foreground">
                          Spent ₹{spent.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-sm">₹</span>
                        <input
                          type="number"
                          value={catBudgets[cat] || 0}
                          onChange={e => {
                            setCatBudgets(prev => ({ ...prev, [cat]: Number(e.target.value) }));
                          }}
                          onBlur={handleSave}
                          style={inputStyle}
                          placeholder="0"
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          /* Compare tab */
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={cardStyle}
            className="p-4"
          >
            <h3 className="text-sm font-semibold text-foreground mb-4">
              6-Month Comparison
            </h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={compareData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 35% 20%)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fill: 'hsl(215 20% 55%)' }}
                  />
                  <Tooltip
                    formatter={(v: number) => `₹${v.toLocaleString('en-IN')}`}
                    contentStyle={tooltipStyle}
                  />
                  <Bar dataKey="Budget" fill="#00D65E" radius={[4, 4, 0, 0]} opacity={0.7} />
                  <Bar dataKey="Spent" fill="#00BFDB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 justify-center mt-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-3 h-3 rounded-sm opacity-70" style={{ background: '#00D65E' }} />
                Budget
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-3 h-3 rounded-sm" style={{ background: '#00BFDB' }} />
                Spent
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
