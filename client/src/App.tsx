import { useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Dumbbell, History, Settings } from "lucide-react";
import Home from "./pages/home";
import HistoryPage from "./pages/history";
import SettingsPage from "./pages/settings";

type Tab = "training" | "history" | "settings";

const tabs: { id: Tab; label: string; icon: typeof Dumbbell }[] = [
  { id: "training", label: "Training", icon: Dumbbell },
  { id: "history", label: "Historie", icon: History },
  { id: "settings", label: "Einstellungen", icon: Settings },
];

function AppLayout() {
  const [activeTab, setActiveTab] = useState<Tab>("training");

  return (
    <div className="relative min-h-screen bg-white">
      {/* Page content */}
      <div className="pb-20">
        {activeTab === "training" && <Home />}
        {activeTab === "history" && <HistoryPage />}
        {activeTab === "settings" && <SettingsPage />}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-gray-100">
        <div className="max-w-md mx-auto flex items-center justify-around px-4 py-3">
          {tabs.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                data-testid={`nav-${id}`}
                onClick={() => setActiveTab(id)}
                className="flex flex-col items-center gap-1 flex-1 py-1 transition-colors"
              >
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200 ${active ? "bg-gray-900 text-white" : "text-gray-400 hover:text-gray-700"}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-[10px] font-semibold tracking-wide transition-colors ${active ? "text-gray-900" : "text-gray-400"}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppLayout />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
