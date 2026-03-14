import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, AlertTriangle, ShieldCheck, ChevronRight, Smartphone } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { getSettings, saveSettings, clearAllData } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import PayAppSetupModal from '@/components/PayAppSetupModal';

export default function SettingsPage() {
  const { toast } = useToast();
  const currentSettings = getSettings();
  const [budget, setBudget] = useState(currentSettings.monthlyBudget.toString());
  const [showAppSetup, setShowAppSetup] = useState(false);
  const [currentApp, setCurrentApp] = useState(currentSettings.payAppName || '');
  
  const handleSaveBudget = () => {
    const num = Number(budget);
    if (!isNaN(num) && num > 0) {
      saveSettings({ monthlyBudget: num });
      toast({
        title: "Settings Saved",
        description: "Your monthly budget has been updated.",
      });
    }
  };

  const handleClearData = () => {
    if (confirm("Are you sure? This will delete all your transactions and settings permanently.")) {
      clearAllData();
      window.location.href = '/'; // force reload
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 flex flex-col">
      <div className="px-5 pt-8 pb-6 bg-background sticky top-0 z-10 border-b border-border">
        <h1 className="text-2xl font-bold font-display text-foreground">Preferences</h1>
      </div>

      <div className="flex-1 px-5 mt-6 space-y-8">
        
        {/* Budget Section */}
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
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-xl pl-9 pr-4 py-3 text-foreground font-bold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
                />
              </div>
              <button 
                onClick={handleSaveBudget}
                className="bg-primary text-white p-3.5 rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 active:scale-95"
              >
                <Save className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">SmartPay AI uses this to calculate your daily spending limits and generate tips.</p>
          </div>
        </motion.section>

        {/* Payment App */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 ml-1">Payment App</h3>
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg" style={{ background: 'rgba(0,214,94,0.12)' }}>
                <Smartphone className="w-5 h-5" style={{ color: '#00D65E' }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">Default UPI App</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {currentApp ? currentApp : 'Not selected yet'}
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
              When you tap Pay, SmartPay AI will open your chosen UPI app with amount pre-filled automatically.
            </p>
          </div>
        </motion.section>

        {/* General Settings */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
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
              <button disabled className="px-4 py-2 bg-secondary text-muted-foreground rounded-lg text-sm font-medium w-full opacity-50 cursor-not-allowed">
                Export to CSV
              </button>
            </div>
          </div>
        </motion.section>

        {/* Danger Zone */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h3 className="text-xs font-bold text-destructive uppercase tracking-wider mb-3 ml-1">Danger Zone</h3>
          <div className="border border-destructive/30 bg-destructive/5 rounded-2xl p-5">
            <div className="flex gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-destructive shrink-0" />
              <div>
                <p className="text-sm font-bold text-foreground">Reset Application</p>
                <p className="text-xs text-muted-foreground mt-1">This will permanently delete all your transactions and budget settings. This action cannot be undone.</p>
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
