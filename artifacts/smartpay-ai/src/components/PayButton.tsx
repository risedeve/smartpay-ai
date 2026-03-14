import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

interface PayButtonProps {
  onClick: () => void;
}

export default function PayButton({ onClick }: PayButtonProps) {
  return (
    <div className="relative">
      {/* Pulsing background rings */}
      <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: '3s' }} />
      <div className="absolute inset-[-10px] rounded-full bg-primary/10 animate-ping" style={{ animationDuration: '3s', animationDelay: '0.5s' }} />
      
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className="relative z-10 w-24 h-24 rounded-full bg-gradient-to-b from-primary to-primary/80 flex flex-col items-center justify-center text-white shadow-[0_0_30px_rgba(108,99,255,0.4)] border border-white/20"
      >
        <Zap className="w-8 h-8 mb-1" fill="currentColor" />
        <span className="font-bold text-lg font-display tracking-wide">PAY</span>
      </motion.button>
    </div>
  );
}
