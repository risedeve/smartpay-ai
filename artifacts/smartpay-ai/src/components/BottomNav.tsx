import { Home, PieChart, Clock, Settings } from 'lucide-react';
import { useLocation, Link } from 'wouter';

export default function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/history', icon: Clock, label: 'History' },
    { path: '/analytics', icon: PieChart, label: 'Analytics' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 max-w-[420px] mx-auto bg-card/80 backdrop-blur-xl border-t border-border pb-safe">
      <div className="flex items-center justify-around px-2 py-3">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          
          return (
            <Link key={item.path} href={item.path} className="flex-1 flex flex-col items-center justify-center gap-1 group py-1 outline-none">
              <div className={`p-2 rounded-xl transition-all duration-300 ${isActive ? 'bg-primary/20 text-primary' : 'text-muted-foreground group-hover:text-foreground group-hover:bg-secondary'}`}>
                <Icon className={`w-6 h-6 ${isActive ? 'drop-shadow-[0_0_8px_rgba(108,99,255,0.6)]' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
