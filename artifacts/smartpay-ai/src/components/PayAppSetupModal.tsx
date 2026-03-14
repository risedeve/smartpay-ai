import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { saveSettings, PayApp } from '@/lib/storage';

interface PayAppSetupModalProps {
  open: boolean;
  onDone: () => void;
}

const APPS: { id: PayApp; label: string; bg: string; fg: string; letter: string; sub: string }[] = [
  { id: 'gpay', label: 'Google Pay', bg: '#4285F4', fg: '#fff', letter: 'G', sub: 'Pay via GPay UPI' },
  { id: 'phonepe', label: 'PhonePe', bg: '#5f259f', fg: '#fff', letter: 'P', sub: 'Pay via PhonePe UPI' },
  { id: 'paytm', label: 'Paytm', bg: '#00B9F1', fg: '#fff', letter: 'Py', sub: 'Pay via Paytm UPI' },
  { id: 'upi', label: 'Any UPI App', bg: '#FF6B00', fg: '#fff', letter: '⬡', sub: 'Default UPI intent' },
];

export default function PayAppSetupModal({ open, onDone }: PayAppSetupModalProps) {
  const [selected, setSelected] = useState<PayApp | null>(null);

  const handleConfirm = () => {
    if (!selected) return;
    const app = APPS.find(a => a.id === selected)!;
    saveSettings({ preferredPayApp: selected, payAppName: app.label });
    onDone();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] max-w-[420px] mx-auto"
            style={{ background: 'rgba(5,8,16,0.88)', backdropFilter: 'blur(8px)' }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 30 }}
            transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[90] max-w-[380px] mx-auto rounded-2xl overflow-hidden"
            style={{ background: 'hsl(222 40% 12%)', border: '1px solid hsl(222 35% 22%)' }}
          >
            {/* Green accent top */}
            <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #00D65E, #00BFDB)' }} />

            <div className="p-6">
              <div className="mb-5">
                <h2 className="text-lg font-bold font-display text-foreground">Choose Payment App</h2>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Select which UPI app to use. This will be your default every time you tap Pay — you can change it anytime in Settings.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {APPS.map(app => {
                  const active = selected === app.id;
                  return (
                    <button
                      key={app.id}
                      onClick={() => setSelected(app.id)}
                      className="relative flex flex-col items-center gap-3 p-4 rounded-2xl transition-all active:scale-95"
                      style={{
                        background: active ? `${app.bg}18` : 'hsl(222 40% 16%)',
                        border: active ? `2px solid ${app.bg}` : '2px solid hsl(222 35% 22%)',
                      }}
                    >
                      {/* App icon */}
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-lg"
                        style={{ background: app.bg, color: app.fg }}
                      >
                        {app.letter}
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-foreground">{app.label}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{app.sub}</p>
                      </div>
                      {/* Checkmark */}
                      {active && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ background: app.bg }}
                        >
                          <Check className="w-3 h-3 text-white" strokeWidth={3} />
                        </motion.div>
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleConfirm}
                disabled={!selected}
                className="w-full py-3.5 rounded-xl font-bold text-base transition-all active:scale-95 disabled:opacity-40"
                style={{
                  background: selected ? '#00D65E' : 'hsl(222 35% 20%)',
                  color: selected ? '#000' : 'hsl(215 20% 50%)',
                }}
              >
                Confirm & Continue
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
