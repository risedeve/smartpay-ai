import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { saveSettings, getSettings } from '@/lib/storage';
import { Sparkles, ArrowRight, Check, User } from 'lucide-react';

interface OnboardingModalProps {
  onComplete: () => void;
}

export default function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const settings = getSettings();
  const [name, setName] = useState('');
  const [budget, setBudget] = useState(settings.monthlyBudget.toString());
  const [categories, setCategories] = useState<string[]>(settings.categories);

  const availableCategories = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Health', 'Bills', 'Groceries', 'Education', 'Travel', 'Others'];

  const handleToggleCategory = (cat: string) => {
    setCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleFinish = () => {
    saveSettings({
      userName: name.trim() || 'You',
      monthlyBudget: Number(budget) || 10000,
      categories: categories.length > 0 ? categories : ['Others'],
      onboarded: true,
    });
    onComplete();
  };

  const inputStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid rgba(0,214,94,0.5)',
    outline: 'none',
    color: '#fff',
    fontSize: 28,
    fontWeight: 700,
    width: '100%',
    padding: '10px 0',
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col max-w-[420px] mx-auto">
      <AnimatePresence mode="wait">

        {/* Step 1 — Welcome splash */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col items-center justify-center p-8 text-center"
          >
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center mb-8 border"
              style={{ background: 'rgba(0,214,94,0.15)', borderColor: 'rgba(0,214,94,0.3)', boxShadow: '0 0 30px rgba(0,214,94,0.2)' }}
            >
              <Sparkles className="w-12 h-12" style={{ color: '#00D65E' }} />
            </div>
            <h1 className="text-4xl font-display font-extrabold text-foreground mb-4">
              SmartPay <span className="text-gradient">AI</span>
            </h1>
            <p className="text-base text-muted-foreground mb-12 max-w-xs leading-relaxed">
              Smarter budgeting and seamless payments powered by intelligent insights.
            </p>
            <button
              onClick={() => setStep(2)}
              className="w-full py-4 rounded-xl bg-white text-black font-bold text-lg flex items-center justify-center gap-2"
            >
              Get Started <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        )}

        {/* Step 2 — Enter name */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col p-8 pt-20"
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6" style={{ background: 'rgba(0,214,94,0.12)' }}>
              <User className="w-6 h-6" style={{ color: '#00D65E' }} />
            </div>
            <h2 className="text-3xl font-display font-bold text-foreground mb-2">What's your name?</h2>
            <p className="text-muted-foreground mb-10 text-sm">We'll personalise your experience.</p>

            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter your name"
              autoFocus
              style={inputStyle}
              onKeyDown={e => e.key === 'Enter' && name.trim() && setStep(3)}
            />

            <div className="mt-auto pt-10">
              <button
                onClick={() => setStep(3)}
                disabled={!name.trim()}
                className="w-full py-4 rounded-xl font-bold text-base disabled:opacity-40 transition-all"
                style={{ background: name.trim() ? '#00D65E' : 'hsl(222 35% 20%)', color: name.trim() ? '#000' : '#666' }}
              >
                Continue
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3 — Monthly budget */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col p-8 pt-20"
          >
            <h2 className="text-3xl font-display font-bold text-foreground mb-2">Set your target</h2>
            <p className="text-muted-foreground mb-10 text-sm">What's your monthly spending budget?</p>

            <div className="flex items-center" style={{ borderBottom: '2px solid rgba(0,214,94,0.5)', paddingBottom: 8 }}>
              <span className="text-4xl text-muted-foreground mr-3 font-display">₹</span>
              <input
                type="number"
                value={budget}
                onChange={e => setBudget(e.target.value)}
                className="bg-transparent border-none outline-none w-full text-5xl font-display font-bold text-foreground"
                autoFocus
              />
            </div>

            <div className="mt-auto pt-10">
              <button
                onClick={() => setStep(4)}
                disabled={!budget}
                className="w-full py-4 rounded-xl font-bold text-base disabled:opacity-40"
                style={{ background: '#00D65E', color: '#000' }}
              >
                Continue
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 4 — Categories */}
        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col p-8 pt-20"
          >
            <h2 className="text-3xl font-display font-bold text-foreground mb-2">What do you track?</h2>
            <p className="text-muted-foreground mb-8 text-sm">Select categories you spend on frequently.</p>

            <div className="flex flex-wrap gap-2 mb-auto overflow-y-auto hide-scrollbar pb-8">
              {availableCategories.map(cat => {
                const isSelected = categories.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => handleToggleCategory(cat)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold transition-all"
                    style={
                      isSelected
                        ? { background: 'rgba(0,214,94,0.15)', border: '1px solid #00D65E', color: '#00D65E' }
                        : { background: 'hsl(222 40% 16%)', border: '1px solid hsl(222 35% 22%)', color: 'hsl(215 20% 65%)' }
                    }
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    {cat}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleFinish}
              disabled={categories.length === 0}
              className="w-full py-4 rounded-xl font-bold text-base disabled:opacity-40"
              style={{ background: categories.length > 0 ? '#00D65E' : 'hsl(222 35% 20%)', color: categories.length > 0 ? '#000' : '#666' }}
            >
              Start using SmartPay AI 🎉
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
