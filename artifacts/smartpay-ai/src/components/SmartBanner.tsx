import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMemo } from 'react';

const TIPS = [
  "You spent 20% less on Food this week. Keep it up!",
  "Based on your habits, you might exceed your transport budget soon.",
  "Great job! You are well within your monthly budget limits.",
  "Consider setting aside 10% of your remaining budget for emergencies.",
  "You have ₹4,500 left for the next 10 days. Pace your spending."
];

export default function SmartBanner() {
  const tip = useMemo(() => TIPS[Math.floor(Math.random() * TIPS.length)], []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-5 mb-4 p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-accent" />
      <div className="flex gap-3">
        <div className="mt-1">
          <Sparkles className="w-5 h-5 text-accent animate-pulse" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-1">AI Insight</h4>
          <p className="text-sm text-foreground/90 leading-snug">{tip}</p>
        </div>
      </div>
    </motion.div>
  );
}
