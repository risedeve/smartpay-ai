import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { saveSettings, getSettings } from '@/lib/storage';
import { Sparkles, ArrowRight, Check } from 'lucide-react';

interface OnboardingModalProps {
  onComplete: () => void;
}

export default function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const settings = getSettings();
  const [budget, setBudget] = useState(settings.monthlyBudget.toString());
  const [categories, setCategories] = useState<string[]>(settings.categories);

  const availableCategories = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Health', 'Bills', 'Groceries', 'Education', 'Travel', 'Others'];

  const handleToggleCategory = (cat: string) => {
    if (categories.includes(cat)) {
      setCategories(categories.filter(c => c !== cat));
    } else {
      setCategories([...categories, cat]);
    }
  };

  const handleFinish = () => {
    saveSettings({
      monthlyBudget: Number(budget) || 10000,
      categories: categories.length > 0 ? categories : ['Others'],
      onboarded: true
    });
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col max-w-[420px] mx-auto">
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="w-24 h-24 bg-primary/20 rounded-3xl flex items-center justify-center mb-8 border border-primary/30 shadow-[0_0_30px_rgba(108,99,255,0.3)]">
              <Sparkles className="w-12 h-12 text-primary" />
            </div>
            <h1 className="text-4xl font-display font-extrabold text-foreground mb-4">
              SmartPay <span className="text-gradient">AI</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-12 max-w-xs">
              Smarter budgeting and seamless payments powered by intelligent insights.
            </p>
            <button 
              onClick={() => setStep(2)}
              className="w-full py-4 rounded-xl bg-white text-black font-bold text-lg flex items-center justify-center gap-2 hover:bg-white/90 transition-colors"
            >
              Get Started <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col p-8 pt-20"
          >
            <h2 className="text-3xl font-display font-bold text-foreground mb-3">Set your target</h2>
            <p className="text-muted-foreground mb-10">What's your monthly spending budget?</p>
            
            <div className="flex items-center border-b-2 border-primary/50 py-4 mb-auto">
              <span className="text-4xl text-muted-foreground mr-3 font-display">₹</span>
              <input 
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="bg-transparent border-none outline-none w-full text-5xl font-display font-bold text-foreground"
                autoFocus
              />
            </div>

            <button 
              onClick={() => setStep(3)}
              disabled={!budget}
              className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-lg disabled:opacity-50 mt-8"
            >
              Continue
            </button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div 
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col p-8 pt-20"
          >
            <h2 className="text-3xl font-display font-bold text-foreground mb-3">What do you track?</h2>
            <p className="text-muted-foreground mb-8">Select categories you spend on frequently.</p>
            
            <div className="flex flex-wrap gap-3 mb-auto overflow-y-auto hide-scrollbar pb-8">
              {availableCategories.map(cat => {
                const isSelected = categories.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => handleToggleCategory(cat)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-full text-sm font-medium transition-all border ${
                      isSelected 
                        ? 'bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(108,99,255,0.2)]' 
                        : 'bg-secondary border-transparent text-muted-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {isSelected && <Check className="w-4 h-4" />}
                    {cat}
                  </button>
                );
              })}
            </div>

            <button 
              onClick={handleFinish}
              disabled={categories.length === 0}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold text-lg shadow-[0_4px_20px_rgba(108,99,255,0.4)] disabled:opacity-50 mt-4"
            >
              Start using SmartPay AI
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
