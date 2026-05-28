import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, AlertTriangle, ShieldCheck, ChevronRight, Smartphone, Plus, X, Tag } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { getSettings, saveSettings, clearAllData } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import PayAppSetupModal from '@/components/PayAppSetupModal';

export default function SettingsPage() {
  const { toast } = useToast();
  const currentSettings = getSettings();

  const [budget, setBudget]         = useState(currentSettings.monthlyBudget.toString());
  const [showAppSetup, setShowAppSetup] = useState(false);
  const [currentApp, setCurrentApp] = useState(currentSettings.payAppName || '');
  const [categories, setCategories] = useState<string[]>(currentSettings.categories);
  const [newCat, setNewCat]         = useState('');

  const handleSaveBudget = () => {
    const num = Number(budget);
    if (!isNaN(num) && num > 0) {
      saveSettings({ monthlyBudget: num });
      toast({ title: 'Settings Saved', description: 'Monthly budget updated.' });
    }
  };

  const handleAddCategory = () => {
    const trimmed = newCat.trim();
    if (!trimmed || categories.map(c => c.toLowerCase()).includes(trimmed.toLowerCase())) return;
    const updated = [...categories, trimmed];
    setCategories(updated);
    saveSettings({ categories: updated });
    setNewCat('');
    toast({ title: 'Category Added', description: `"${trimmed}" added to your categories.` });
  };

  const handleDeleteCategory = (cat: string) => {
    if (categories.length <= 1) {
      toast({ title: 'Cannot Delete', description: 'You need at least one category.' });
      return;
    }
    const updated = categories.filter(c => c !== cat);
    setCategories(updated);
    saveSettings({ categories: updated });
  };

  const handleClearData = () => {
    if (confirm('Are you sure? This will delete all your transactions and settings permanently.')) {
      clearAllData();
      window.location.href = '/';
    }
  };

  const inputStyle: React.CSSProperties = {
    background: 'hsl(222 40% 16%)',
    border: '1px solid hsl(222 35% 22%)',
  };

  return (
    <div className="min-h-screen bg-background pb-24 flex flex-col">
      <div className="px-5 pt-8 pb-6 bg-background sticky top-0 z-10 border-b border-border">
        <h1 className="text-2xl font-bold font-display text-foreground">Preferences</h1>
      </div>

      <div className="flex-1 px-5 mt-6 space-y-8">

        {/* Monthly Budget */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 ml-1">Monthly Budget</h3>
          <div className="glass rounded-2xl p-5">
            <label className="text-sm font-medium text-foreground mb-2 block">Target Amount</label>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-display font-bold">₹</span>
                <input
                  type="number"
                  value={budget}
                  onChange={e => setBudget(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-xl pl-9 pr-4 py-3 text-foreground font-bold focus:outline-none focus:border-primary transition-all"
                />
              </div>
              <button
                onClick={handleSaveBudget}
                className="bg-primary text-white p-3.5 rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 active:scale-95"
              >
                <Save className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              SmartPay AI uses this to calculate daily limits and generate tips.
            </p>
          </div>
        </motion.section>

        {/* Categories */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 ml-1">Categories</h3>
          <div className="glass rounded-2xl p-5 space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Add your own spending categories. Use the sub-category field while paying for more detail (e.g. Food → Rashan).
            </p>

            {/* Existing categories */}
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <div key={cat}
                  className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-xs font-semibold"
                  style={{ background: 'hsl(222 35% 20%)', border: '1px solid hsl(222 30% 28%)', color: 'hsl(215 20% 75%)' }}>
                  <Tag className="w-3 h-3 opacity-60" />
                  {cat}
                  <button
                    onClick={() => handleDeleteCategory(cat)}
                    className="ml-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90"
                    style={{ background: 'hsl(222 30% 28%)' }}>
                    <X className="w-2.5 h-2.5" style={{ color: '#FF6666' }} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new category */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newCat}
                onChange={e => setNewCat(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                placeholder="Add new category..."
                maxLength={24}
                className="flex-1 px-4 py-2.5 text-sm text-foreground rounded-xl outline-none"
                style={inputStyle}
              />
              <button
                onClick={handleAddCategory}
                disabled={!newCat.trim()}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-40"
                style={{ background: 'rgba(0,214,94,0.15)', color: '#00D65E', border: '1px solid rgba(0,214,94,0.3)' }}
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>
        </motion.section>

        {/* Payment App */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 ml-1">Payment App</h3>
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg" style={{ background: 'rgba(0,214,94,0.12)' }}>
                <Smartphone className="w-5 h-5" style={{ color: '#00D65E' }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">Default UPI App</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {currentApp || 'Not selected yet'}
                </p>
              </div>
              <button
                onClick={() => setShowAppSetup(true)}
                className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                style={{ background: 'rgba(0,214,94,0.12)', color: '#00D65E', border: '1px solid rgba(0,214,94,0.25)' }}
              >
                {currentApp ? 'Change' : 'Select'}
              </button>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              When you tap Pay, SmartPay AI opens your UPI app with the amount pre-filled automatically.
            </p>
          </div>
        </motion.section>

        {/* General */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 ml-1">General</h3>
          <div className="glass rounded-2xl overflow-hidden divide-y divide-border/50">
            <button className="w-full px-5 py-4 flex items-center justify-between hover:bg-secondary/50 transition-colors active:bg-secondary">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg text-accent">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-foreground">Data Privacy</p>
                  <p className="text-xs text-muted-foreground mt-0.5">All data stays on your device</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            <div className="px-5 py-4">
              <div className="text-left mb-3">
                <p className="text-sm font-bold text-foreground">Export Data</p>
                <p className="text-xs text-muted-foreground mt-0.5">Coming soon in next update</p>
              </div>
              <button disabled
                className="px-4 py-2 bg-secondary text-muted-foreground rounded-lg text-sm font-medium w-full opacity-50 cursor-not-allowed">
                Export to CSV
              </button>
            </div>
          </div>
        </motion.section>

        {/* Danger Zone */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
          <h3 className="text-xs font-bold text-destructive uppercase tracking-wider mb-3 ml-1">Danger Zone</h3>
          <div className="border border-destructive/30 bg-destructive/5 rounded-2xl p-5">
            <div className="flex gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-destructive shrink-0" />
              <div>
                <p className="text-sm font-bold text-foreground">Reset Application</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Permanently deletes all transactions and settings. Cannot be undone.
                </p>
              </div>
            </div>
            <button
              onClick={handleClearData}
              className="w-full py-3 rounded-xl bg-destructive text-white font-bold text-sm hover:bg-destructive/90 transition-colors active:scale-[0.98]"
            >
              Clear All Data
            </button>
          </div>
        </motion.section>

      </div>

      <BottomNav />

      <PayAppSetupModal
        open={showAppSetup}
        onDone={() => {
          setShowAppSetup(false);
          setCurrentApp(getSettings().payAppName || '');
        }}
      />
    </div>
  );
}
