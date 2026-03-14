import { motion } from 'framer-motion';

interface BudgetRingProps {
  spent: number;
  budget: number;
}

export default function BudgetRing({ spent, budget }: BudgetRingProps) {
  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min((spent / (budget || 1)) * 100, 100);
  const offset = circumference - (percentage / 100) * circumference;

  const isOverBudget = spent > budget;

  return (
    <div className="relative flex items-center justify-center">
      <svg className="transform -rotate-90 w-64 h-64">
        {/* Background track */}
        <circle
          cx="128"
          cy="128"
          r={radius}
          stroke="currentColor"
          strokeWidth="16"
          fill="transparent"
          className="text-secondary"
        />
        {/* Progress track */}
        <motion.circle
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          cx="128"
          cy="128"
          r={radius}
          stroke="currentColor"
          strokeWidth="16"
          fill="transparent"
          strokeDasharray={circumference}
          strokeLinecap="round"
          className={isOverBudget ? "text-destructive drop-shadow-[0_0_8px_rgba(255,77,77,0.5)]" : "text-primary drop-shadow-[0_0_8px_rgba(108,99,255,0.5)]"}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-sm font-medium text-muted-foreground mb-1">Spent so far</span>
        <span className={`text-4xl font-bold font-display ${isOverBudget ? 'text-destructive' : 'text-foreground'}`}>
          ₹{spent.toLocaleString('en-IN')}
        </span>
        <span className="text-xs text-muted-foreground mt-1 bg-secondary/50 px-2 py-1 rounded-full">
          of ₹{budget.toLocaleString('en-IN')}
        </span>
      </div>
    </div>
  );
}
