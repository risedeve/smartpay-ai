import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Index from "@/pages/index";
import History from "@/pages/history";
import Analytics from "@/pages/analytics";
import SettingsPage from "@/pages/settings";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Index} />
      <Route path="/history" component={History} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="bg-black min-h-screen w-full flex items-center justify-center sm:p-4">
          {/* Mobile frame wrapper for desktop viewing */}
          <div className="w-full max-w-[420px] h-full sm:h-[90vh] min-h-screen sm:min-h-0 bg-background sm:rounded-[2.5rem] sm:border-[8px] border-[#1E1E2D] relative overflow-hidden sm:shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </div>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
