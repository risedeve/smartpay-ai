import { Home, LayoutDashboard, BookOpen, Lightbulb } from 'lucide-react';
import { useLocation, Link } from 'wouter';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/budget', icon: BookOpen, label: 'Budget' },
  { path: '/insights', icon: Lightbulb, label: 'Insights' },
];

export default function BottomNav() {
  const [location] = useLocation();

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30 max-w-[420px] mx-auto border-t"
      style={{
        background: 'hsl(225 42% 8% / 0.97)',
        borderColor: 'hsl(222 35% 18%)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div className="flex items-center justify-around px-1 py-2">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-1 outline-none"
            >
              <div
                className="p-2 rounded-xl transition-all duration-200"
                style={
                  isActive
                    ? { background: 'rgba(0,214,94,0.15)' }
                    : {}
                }
              >
                <Icon
                  className="w-5 h-5 transition-colors"
                  strokeWidth={isActive ? 2.5 : 1.8}
                  style={{ color: isActive ? '#00D65E' : 'hsl(215 20% 55%)' }}
                />
              </div>
              <span
                className="text-[10px] font-medium transition-colors"
                style={{ color: isActive ? '#00D65E' : 'hsl(215 20% 55%)' }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
