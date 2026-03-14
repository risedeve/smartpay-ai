import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Search, Filter } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { getAllTransactions, deleteTransaction, Transaction, getSettings } from '@/lib/storage';

export default function History() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string | null>(null);
  const settings = getSettings();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const data = getAllTransactions();
    setTransactions(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this transaction?')) {
      deleteTransaction(id);
      loadData();
    }
  };

  const filteredData = transactions.filter(t => {
    const matchesSearch = t.note.toLowerCase().includes(search.toLowerCase()) || 
                          t.category.toLowerCase().includes(search.toLowerCase()) ||
                          t.amount.toString().includes(search);
    const matchesFilter = filter ? t.category === filter : true;
    return matchesSearch && matchesFilter;
  });

  // Group by month
  const groupedData: Record<string, Transaction[]> = {};
  filteredData.forEach(t => {
    const month = new Date(t.date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    if (!groupedData[month]) groupedData[month] = [];
    groupedData[month].push(t);
  });

  return (
    <div className="min-h-screen bg-background pb-24 flex flex-col">
      <div className="px-5 pt-8 pb-4 sticky top-0 bg-background/80 backdrop-blur-xl z-20 border-b border-border">
        <h1 className="text-2xl font-bold font-display text-foreground mb-4">Transaction History</h1>
        
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-secondary rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground outline-none border border-transparent focus:border-primary/50 transition-colors"
            />
          </div>
          
          <div className="relative group">
            <button className="h-full px-3 bg-secondary rounded-xl border border-transparent hover:border-primary/50 text-muted-foreground flex items-center justify-center transition-colors">
              <Filter className="w-4 h-4" />
            </button>
            <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-xl shadow-xl p-2 hidden group-hover:block z-30">
              <button 
                onClick={() => setFilter(null)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm ${!filter ? 'bg-primary/20 text-primary' : 'hover:bg-secondary text-muted-foreground'}`}
              >
                All Categories
              </button>
              {settings.categories.map(cat => (
                <button 
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm mt-1 ${filter === cat ? 'bg-primary/20 text-primary' : 'hover:bg-secondary text-muted-foreground'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-5 mt-4 space-y-6 overflow-y-auto">
        {Object.keys(groupedData).length === 0 ? (
          <div className="text-center py-20 text-muted-foreground text-sm">
            No transactions found.
          </div>
        ) : (
          Object.entries(groupedData).map(([month, txs], i) => (
            <motion.div 
              key={month}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 ml-1">{month}</h3>
              <div className="space-y-3">
                <AnimatePresence>
                  {txs.map(t => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9, height: 0, marginBottom: 0 }}
                      key={t.id} 
                      className="glass rounded-2xl p-4 flex flex-col gap-3 group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-secondary/80 flex items-center justify-center text-muted-foreground font-bold text-sm border border-white/5">
                            {t.category.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">{t.category}</p>
                            <p className="text-xs text-muted-foreground font-medium mt-0.5">
                              {new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <span className="text-base font-bold text-foreground font-display">-₹{t.amount.toLocaleString('en-IN')}</span>
                      </div>
                      
                      <div className="flex items-center justify-between pt-3 border-t border-white/5">
                        <p className="text-xs text-muted-foreground/80 italic line-clamp-1">{t.note || 'No description provided'}</p>
                        <button 
                          onClick={() => handleDelete(t.id)}
                          className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}
