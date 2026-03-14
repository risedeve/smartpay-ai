import { motion } from 'framer-motion';

interface PayButtonProps {
  onClick: () => void;
}

export default function PayButton({ onClick }: PayButtonProps) {
  return (
    <div className="relative flex items-center justify-center">
      <div
        className="absolute rounded-full animate-ping"
        style={{
          width: 120,
          height: 120,
          background: 'radial-gradient(circle, rgba(0,214,94,0.25) 0%, transparent 70%)',
          animationDuration: '2.5s',
        }}
      />
      <div
        className="absolute rounded-full animate-ping"
        style={{
          width: 140,
          height: 140,
          background: 'radial-gradient(circle, rgba(0,214,94,0.12) 0%, transparent 70%)',
          animationDuration: '2.5s',
          animationDelay: '0.4s',
        }}
      />
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.93 }}
        onClick={onClick}
        className="relative z-10 w-28 h-28 rounded-full flex flex-col items-center justify-center text-black font-bold shadow-lg"
        style={{
          background: 'radial-gradient(circle at 40% 35%, #4DFFA0, #00D65E 60%, #00A847)',
          boxShadow: '0 0 40px rgba(0,214,94,0.45), 0 0 80px rgba(0,214,94,0.2)',
        }}
      >
        <span className="text-2xl font-black font-display tracking-widest" style={{ color: '#000' }}>PAY</span>
        <span className="text-[10px] font-semibold mt-0.5 opacity-70" style={{ color: '#000' }}>Tap to pay</span>
      </motion.button>
    </div>
  );
}
