import { motion } from 'framer-motion';

interface BudgetRingProps {
  spent: number;
  budget: number;
}

export default function BudgetRing({ spent, budget }: BudgetRingProps) {
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min((spent / (budget || 1)) * 100, 100);
  const offset = circumference - (percentage / 100) * circumference;
  const remaining = Math.max(budget - spent, 0);
  const isOverBudget = spent > budget;

  return (
    <div className="relative flex items-center justify-center">
      <svg className="transform -rotate-90 w-56 h-56">
        <circle
          cx="112"
          cy="112"
          r={radius}
          stroke="hsl(222 35% 18%)"
          strokeWidth="12"
          fill="transparent"
        />
        <motion.circle
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          cx="112"
          cy="112"
          r={radius}
          stroke={isOverBudget ? '#FF4444' : '#00D65E'}
          strokeWidth="12"
          fill="transparent"
          strokeDasharray={circumference}
          strokeLinecap="round"
          style={{
            filter: isOverBudget
              ? 'drop-shadow(0 0 8px rgba(255,68,68,0.6))'
              : 'drop-shadow(0 0 8px rgba(0,214,94,0.6))',
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-xs font-medium text-muted-foreground mb-1">
          {isOverBudget ? 'Over Budget' : 'Remaining'}
        </span>
        <span
          className="text-3xl font-bold font-display"
          style={{ color: isOverBudget ? '#FF4444' : '#FFFFFF' }}
        >
          ₹{remaining.toLocaleString('en-IN')}
        </span>
        <span className="text-xs text-muted-foreground mt-1">
          {Math.round(percentage)}% used
        </span>
      </div>
    </div>
  );
}
