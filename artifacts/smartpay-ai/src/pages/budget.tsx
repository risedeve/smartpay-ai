import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Download, ArrowLeftRight, CircleDollarSign, FileDown } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
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

const selectStyle: React.CSSProperties = {
  background: 'hsl(222 40% 12%)',
  border: '1px solid hsl(222 35% 22%)',
  borderRadius: 10,
  color: '#fff',
  outline: 'none',
  padding: '8px 10px',
  fontSize: 13,
};

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

export default function Budget() {
  const now = new Date();
  const settings = getSettings();
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  // Budget tab state
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [tab, setTab] = useState<'budget' | 'compare'>('budget');

  const monthBudget = getMonthBudget(selectedMonth, selectedYear);
  const [totalBudget, setTotalBudget] = useState(monthBudget.totalBudget);
  const [catBudgets, setCatBudgets] = useState<Record<string, number>>(
    Object.fromEntries(monthBudget.categoryBudgets.map(c => [c.category, c.budget]))
  );

  // Compare tab state — two independently selectable months
  const prevM = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const prevY = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const [cmpAMonth, setCmpAMonth] = useState(prevM);
  const [cmpAYear, setCmpAYear] = useState(prevY);
  const [cmpBMonth, setCmpBMonth] = useState(now.getMonth());
  const [cmpBYear, setCmpBYear] = useState(now.getFullYear());

  const categorySpends = useMemo(() => {
    const txns = getTransactionsByMonth(selectedMonth, selectedYear);
    const data: Record<string, number> = {};
    settings.categories.forEach(c => (data[c] = 0));
    txns.forEach(t => { data[t.category] = (data[t.category] || 0) + t.amount; });
    return data;
  }, [selectedMonth, selectedYear, settings.categories]);

  const handleSave = useCallback(() => {
    saveMonthBudget(selectedMonth, selectedYear, {
      totalBudget,
      categoryBudgets: settings.categories.map(c => ({ category: c, budget: catBudgets[c] || 0 })),
    });
  }, [selectedMonth, selectedYear, totalBudget, catBudgets, settings.categories]);

  // Compare data: per-category for two selected months
  const compareData = useMemo(() => {
    const aTxns = getTransactionsByMonth(cmpAMonth, cmpAYear);
    const bTxns = getTransactionsByMonth(cmpBMonth, cmpBYear);
    const aBudget = getMonthBudget(cmpAMonth, cmpAYear);
    const bBudget = getMonthBudget(cmpBMonth, cmpBYear);

    const aSpend: Record<string, number> = {};
    const bSpend: Record<string, number> = {};
    settings.categories.forEach(c => { aSpend[c] = 0; bSpend[c] = 0; });
    aTxns.forEach(t => { aSpend[t.category] = (aSpend[t.category] || 0) + t.amount; });
    bTxns.forEach(t => { bSpend[t.category] = (bSpend[t.category] || 0) + t.amount; });

    return settings.categories.map(cat => {
      const aCatBudget = aBudget.categoryBudgets.find(x => x.category === cat)?.budget ?? 0;
      const bCatBudget = bBudget.categoryBudgets.find(x => x.category === cat)?.budget ?? 0;
      return {
        category: cat,
        [`${MONTH_NAMES[cmpAMonth].slice(0, 3)} Spent`]: aSpend[cat],
        [`${MONTH_NAMES[cmpBMonth].slice(0, 3)} Spent`]: bSpend[cat],
        [`${MONTH_NAMES[cmpAMonth].slice(0, 3)} Budget`]: aCatBudget,
        [`${MONTH_NAMES[cmpBMonth].slice(0, 3)} Budget`]: bCatBudget,
        aSpent: aSpend[cat],
        bSpent: bSpend[cat],
        aBudget: aCatBudget,
        bBudget: bCatBudget,
      };
    }).filter(d => d.aSpent > 0 || d.bSpent > 0);
  }, [cmpAMonth, cmpAYear, cmpBMonth, cmpBYear, settings.categories]);

  const aTotal = getSpendForMonth(cmpAMonth, cmpAYear);
  const bTotal = getSpendForMonth(cmpBMonth, cmpBYear);
  const aLabel = `${MONTH_NAMES[cmpAMonth].slice(0, 3)} '${String(cmpAYear).slice(2)}`;
  const bLabel = `${MONTH_NAMES[cmpBMonth].slice(0, 3)} '${String(cmpBYear).slice(2)}`;

  const handleDownloadPDF = () => {
    const rows = compareData.map(d => `
      <tr>
        <td>${d.category}</td>
        <td>₹${d.aBudget.toLocaleString('en-IN')}</td>
        <td style="color:${d.aSpent > d.aBudget && d.aBudget > 0 ? '#ff4444' : '#00D65E'}">₹${d.aSpent.toLocaleString('en-IN')}</td>
        <td>₹${d.bBudget.toLocaleString('en-IN')}</td>
        <td style="color:${d.bSpent > d.bBudget && d.bBudget > 0 ? '#ff4444' : '#00D65E'}">₹${d.bSpent.toLocaleString('en-IN')}</td>
        <td style="color:${d.bSpent > d.aSpent ? '#ff4444' : '#00D65E'}">${d.bSpent > d.aSpent ? '+' : ''}₹${(d.bSpent - d.aSpent).toLocaleString('en-IN')}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>SmartPay AI — Budget Comparison</title>
  <style>
    body { font-family: Arial, sans-serif; background: #fff; color: #111; padding: 32px; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    .sub { color: #666; font-size: 13px; margin-bottom: 24px; }
    .summary { display: flex; gap: 24px; margin-bottom: 28px; }
    .summary-card { flex: 1; border: 1px solid #ddd; border-radius: 10px; padding: 16px; }
    .summary-card h3 { font-size: 12px; color: #888; margin: 0 0 6px; text-transform: uppercase; }
    .summary-card .val { font-size: 24px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #f4f4f4; text-align: left; padding: 10px 12px; font-size: 11px; text-transform: uppercase; color: #555; }
    td { padding: 10px 12px; border-bottom: 1px solid #eee; }
    tr:last-child td { border-bottom: none; }
    .footer { margin-top: 32px; font-size: 11px; color: #aaa; text-align: center; }
  </style>
</head>
<body>
  <h1>SmartPay AI — Budget Comparison</h1>
  <div class="sub">Generated on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
  <div class="summary">
    <div class="summary-card">
      <h3>${aLabel} Total Spent</h3>
      <div class="val">₹${aTotal.toLocaleString('en-IN')}</div>
    </div>
    <div class="summary-card">
      <h3>${bLabel} Total Spent</h3>
      <div class="val">₹${bTotal.toLocaleString('en-IN')}</div>
    </div>
    <div class="summary-card">
      <h3>Difference</h3>
      <div class="val" style="color:${bTotal > aTotal ? '#ff4444' : '#00aa44'}">${bTotal > aTotal ? '+' : ''}₹${(bTotal - aTotal).toLocaleString('en-IN')}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Category</th>
        <th>${aLabel} Budget</th>
        <th>${aLabel} Spent</th>
        <th>${bLabel} Budget</th>
        <th>${bLabel} Spent</th>
        <th>Change</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">SmartPay AI • Budget Report</div>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => { win.focus(); win.print(); }, 400);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 overflow-y-auto hide-scrollbar">
      {/* Header */}
      <div className="px-5 pt-6 pb-3 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Budget Planner</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Plan &amp; compare your budgets</p>
        </div>
        {tab === 'budget' && (
          <button onClick={handleSave} className="p-2.5 rounded-xl" style={{ background: 'hsl(222 40% 18%)' }} title="Save">
            <Download className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
        {tab === 'compare' && (
          <button onClick={handleDownloadPDF} className="p-2.5 rounded-xl flex items-center gap-1.5 text-xs font-semibold pr-3" style={{ background: 'rgba(0,214,94,0.12)', color: '#00D65E', border: '1px solid rgba(0,214,94,0.25)' }}>
            <FileDown className="w-4 h-4" /> PDF
          </button>
        )}
      </div>

      <div className="px-4 space-y-4">
        {/* Tab toggle */}
        <div className="flex rounded-xl overflow-hidden" style={{ background: 'hsl(222 40% 12%)', border: '1px solid hsl(222 35% 18%)' }}>
          {(['budget', 'compare'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-all rounded-xl capitalize"
              style={tab === t ? { background: '#00D65E', color: '#000' } : { color: 'hsl(215 20% 55%)' }}
            >
              {t === 'budget' ? <CircleDollarSign className="w-4 h-4" /> : <ArrowLeftRight className="w-4 h-4" />}
              {t === 'budget' ? 'Budget' : 'Compare'}
            </button>
          ))}
        </div>

        {tab === 'budget' ? (
          <>
            {/* Month/Year selectors for budget tab */}
            <div className="flex gap-3">
              <select value={selectedMonth} onChange={e => { const m = parseInt(e.target.value); setSelectedMonth(m); const b = getMonthBudget(m, selectedYear); setTotalBudget(b.totalBudget); setCatBudgets(Object.fromEntries(b.categoryBudgets.map(c => [c.category, c.budget]))); }} className="flex-1" style={selectStyle}>
                {MONTH_NAMES.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <select value={selectedYear} onChange={e => { const y = parseInt(e.target.value); setSelectedYear(y); const b = getMonthBudget(selectedMonth, y); setTotalBudget(b.totalBudget); setCatBudgets(Object.fromEntries(b.categoryBudgets.map(c => [c.category, c.budget]))); }} style={selectStyle}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* Total budget input */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={cardStyle} className="p-4">
              <p className="text-xs text-muted-foreground mb-2">Total Monthly Budget</p>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-lg">₹</span>
                <input type="number" value={totalBudget} onChange={e => setTotalBudget(Number(e.target.value))} onBlur={handleSave}
                  className="bg-transparent border-none outline-none text-xl font-bold text-foreground w-full"
                  style={{ fontFamily: 'var(--font-display)' }} />
              </div>
            </motion.div>

            {/* Category allocation — structured table */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={cardStyle} className="overflow-hidden">
              <div className="px-4 pt-4 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Category Limits</h3>
                <span className="text-[10px] text-muted-foreground">Tap budget to edit</span>
              </div>

              {/* Column headers */}
              <div
                className="grid px-4 pb-2"
                style={{
                  gridTemplateColumns: '2fr 2fr 1.8fr 1.8fr',
                  borderBottom: '1px solid hsl(222 35% 20%)',
                }}
              >
                {['Category', 'Budget', 'Actual', 'Remaining'].map(h => (
                  <span key={h} className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'hsl(215 20% 45%)' }}>{h}</span>
                ))}
              </div>

              {/* Data rows */}
              {settings.categories.map((cat, i) => {
                const actual = categorySpends[cat] || 0;
                const budget = catBudgets[cat] || 0;
                const remaining = budget - actual;
                const over = budget > 0 && actual > budget;
                const remainColor = over ? '#FF4444' : budget === 0 ? 'hsl(215 20% 50%)' : remaining <= budget * 0.1 ? '#FFB800' : '#00D65E';

                return (
                  <div
                    key={cat}
                    className="grid px-4 py-2.5 items-center"
                    style={{
                      gridTemplateColumns: '2fr 2fr 1.8fr 1.8fr',
                      borderTop: i > 0 ? '1px solid hsl(222 35% 16%)' : 'none',
                    }}
                  >
                    {/* Category */}
                    <span className="text-xs font-semibold text-foreground">{cat}</span>

                    {/* Budget — editable */}
                    <div className="flex items-center gap-0.5">
                      <span className="text-[10px] text-muted-foreground">₹</span>
                      <input
                        type="number"
                        value={catBudgets[cat] || ''}
                        onChange={e => setCatBudgets(prev => ({ ...prev, [cat]: Number(e.target.value) }))}
                        onBlur={handleSave}
                        placeholder="—"
                        className="bg-transparent outline-none text-xs text-foreground w-full"
                        style={{ maxWidth: 56 }}
                      />
                    </div>

                    {/* Actual spent */}
                    <span className="text-xs font-semibold" style={{ color: over ? '#FF4444' : 'hsl(215 20% 70%)' }}>
                      ₹{actual.toLocaleString('en-IN')}
                    </span>

                    {/* Remaining / deviation */}
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold" style={{ color: remainColor }}>
                        {budget === 0 ? '—' : (over ? '-' : '+') + '₹' + Math.abs(remaining).toLocaleString('en-IN')}
                      </span>
                      {over && <span className="text-[9px]">⚠</span>}
                    </div>
                  </div>
                );
              })}

              {/* Totals row */}
              {(() => {
                const totalActual = settings.categories.reduce((s, c) => s + (categorySpends[c] || 0), 0);
                const totalBudgetSum = settings.categories.reduce((s, c) => s + (catBudgets[c] || 0), 0);
                const totalRemaining = totalBudgetSum - totalActual;
                const totalOver = totalActual > totalBudgetSum && totalBudgetSum > 0;
                return (
                  <div
                    className="grid px-4 py-3 items-center"
                    style={{
                      gridTemplateColumns: '2fr 2fr 1.8fr 1.8fr',
                      borderTop: '2px solid hsl(222 35% 20%)',
                      background: 'hsl(222 40% 10%)',
                    }}
                  >
                    <span className="text-[11px] font-bold text-foreground">Total</span>
                    <span className="text-[11px] font-bold text-foreground">
                      ₹{totalBudgetSum.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[11px] font-bold" style={{ color: totalOver ? '#FF4444' : 'hsl(215 20% 70%)' }}>
                      ₹{totalActual.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[11px] font-bold" style={{ color: totalOver ? '#FF4444' : '#00D65E' }}>
                      {totalBudgetSum === 0 ? '—' : (totalOver ? '-' : '+') + '₹' + Math.abs(totalRemaining).toLocaleString('en-IN')}
                    </span>
                  </div>
                );
              })()}

              <div className="px-4 py-3">
                <button
                  onClick={handleSave}
                  className="w-full py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95"
                  style={{ background: '#00D65E', color: '#000' }}
                >
                  Save Budgets
                </button>
              </div>
            </motion.div>
          </>
        ) : (
          /* ── COMPARE TAB ── */
          <>
            {/* Month A & B selectors */}
            <div className="grid grid-cols-2 gap-3">
              {/* Month A */}
              <div style={cardStyle} className="p-3">
                <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider font-semibold" style={{ color: '#00D65E' }}>Month A</p>
                <select value={cmpAMonth} onChange={e => setCmpAMonth(parseInt(e.target.value))} className="w-full mb-2" style={selectStyle}>
                  {MONTH_NAMES.map((m, i) => <option key={m} value={i}>{m.slice(0, 3)}</option>)}
                </select>
                <select value={cmpAYear} onChange={e => setCmpAYear(parseInt(e.target.value))} className="w-full" style={selectStyle}>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              {/* Month B */}
              <div style={cardStyle} className="p-3">
                <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider font-semibold" style={{ color: '#00BFDB' }}>Month B</p>
                <select value={cmpBMonth} onChange={e => setCmpBMonth(parseInt(e.target.value))} className="w-full mb-2" style={selectStyle}>
                  {MONTH_NAMES.map((m, i) => <option key={m} value={i}>{m.slice(0, 3)}</option>)}
                </select>
                <select value={cmpBYear} onChange={e => setCmpBYear(parseInt(e.target.value))} className="w-full" style={selectStyle}>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {/* Total summary */}
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-2">
              {[
                { label: aLabel, val: aTotal, color: '#00D65E' },
                { label: bLabel, val: bTotal, color: '#00BFDB' },
                { label: 'Difference', val: bTotal - aTotal, color: bTotal > aTotal ? '#FF4444' : '#00D65E', prefix: bTotal > aTotal ? '+' : '' },
              ].map(({ label, val, color, prefix = '' }) => (
                <div key={label} style={cardStyle} className="p-3 text-center">
                  <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
                  <p className="text-sm font-bold" style={{ color }}>
                    {prefix}₹{Math.abs(val).toLocaleString('en-IN')}
                  </p>
                </div>
              ))}
            </motion.div>

            {/* Category-wise bar chart */}
            {compareData.length === 0 ? (
              <div style={cardStyle} className="p-6 text-center text-sm text-muted-foreground">No transactions found for selected months.</div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={cardStyle} className="p-4">
                <p className="text-sm font-semibold text-foreground mb-4">Spend by Category</p>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={compareData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 35% 20%)" vertical={false} />
                      <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'hsl(215 20% 55%)' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'hsl(215 20% 55%)' }} />
                      <Tooltip formatter={(v: number) => `₹${v.toLocaleString('en-IN')}`} contentStyle={tooltipStyle} />
                      <Bar dataKey="aSpent" name={aLabel} fill="#00D65E" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="bSpent" name={bLabel} fill="#00BFDB" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex gap-4 justify-center mt-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><div className="w-3 h-2.5 rounded-sm" style={{ background: '#00D65E' }} />{aLabel}</div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><div className="w-3 h-2.5 rounded-sm" style={{ background: '#00BFDB' }} />{bLabel}</div>
                </div>
              </motion.div>
            )}

            {/* Category detail table */}
            {compareData.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={cardStyle} className="p-4 overflow-x-auto">
                <p className="text-sm font-semibold text-foreground mb-3">Category Breakdown</p>
                <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Category', aLabel + ' Spent', bLabel + ' Spent', 'Change'].map(h => (
                        <th key={h} className="text-left pb-2 font-semibold" style={{ color: 'hsl(215 20% 50%)', paddingRight: 8 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {compareData.map(d => {
                      const diff = d.bSpent - d.aSpent;
                      return (
                        <tr key={d.category} style={{ borderTop: '1px solid hsl(222 35% 18%)' }}>
                          <td className="py-2.5 font-semibold text-foreground" style={{ paddingRight: 8 }}>{d.category}</td>
                          <td className="py-2.5" style={{ color: '#00D65E', paddingRight: 8 }}>₹{d.aSpent.toLocaleString('en-IN')}</td>
                          <td className="py-2.5" style={{ color: '#00BFDB', paddingRight: 8 }}>₹{d.bSpent.toLocaleString('en-IN')}</td>
                          <td className="py-2.5 font-bold" style={{ color: diff > 0 ? '#FF4444' : '#00D65E' }}>
                            {diff > 0 ? '+' : ''}₹{Math.abs(diff).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </motion.div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
