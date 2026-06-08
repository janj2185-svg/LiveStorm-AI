import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import {
  LayoutDashboard,
  Video,
  Trophy,
  Castle,
  Layers,
  Bot,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
  Zap,
  Sword,
  Gamepad2,
  Globe,
  Wand2,
  BarChart2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/contexts/LanguageContext";
import { type Language } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { t, language, setLanguage } = useLanguage();

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  const NAVIGATION = [
    { name: t("nav_dashboard"), href: "/dashboard", icon: LayoutDashboard, testId: "dashboard" },
    { name: t("nav_live_studio"), href: "/live-studio", icon: Video, testId: "live-studio" },
    { name: t("nav_gamification"), href: "/gamification", icon: Trophy, testId: "gamification" },
    { name: t("nav_boss_battle"), href: "/boss-battle", icon: Sword, testId: "boss-battle" },
    { name: t("nav_kingdom"), href: "/kingdom", icon: Castle, testId: "kingdom" },
    { name: t("nav_mini_games"), href: "/mini-games", icon: Gamepad2, testId: "mini-games" },
    { name: t("nav_universe"), href: "/universe", icon: Globe, testId: "universe" },
    { name: t("nav_automation"), href: "/automation", icon: Zap, testId: "automation" },
    { name: t("nav_overlays"), href: "/overlays", icon: Layers, testId: "overlays" },
    { name: t("nav_ai_assistant"), href: "/ai-assistant", icon: Bot, testId: "ai-assistant" },
    { name: t("nav_ai_content"), href: "/ai-content", icon: Wand2, testId: "ai-content" },
    { name: t("nav_analytics"), href: "/analytics", icon: BarChart2, testId: "analytics" },
    { name: t("nav_settings"), href: "/settings", icon: SettingsIcon, testId: "settings" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <img src={`${basePath}/logo.svg`} alt="LiveStorm AI" className="h-8 w-8" />
          <span className="font-bold text-lg tracking-tight">LiveStorm AI</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 hidden md:flex items-center gap-3">
          <img src={`${basePath}/logo.svg`} alt="LiveStorm AI" className="h-8 w-8" />
          <span className="font-bold text-xl tracking-tight text-white">LiveStorm AI</span>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4 md:mt-0 overflow-y-auto">
          {NAVIGATION.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="block" onClick={() => setIsSidebarOpen(false)}>
                <div
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                    isActive
                      ? "bg-primary/20 text-primary border border-primary/30 shadow-[0_0_15px_rgba(124,58,237,0.2)]"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                  data-testid={`link-${item.testId}`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="font-medium text-sm truncate">{item.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {user && (
          <div className="p-4 border-t border-sidebar-border bg-black/20">
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="border border-border">
                <AvatarImage src={user.imageUrl} />
                <AvatarFallback>{user.firstName?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user.fullName || user.primaryEmailAddress?.emailAddress}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.primaryEmailAddress?.emailAddress}
                </p>
              </div>
            </div>
            {/* Language switcher */}
            <div className="mb-3">
              <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider mb-1.5 px-0.5">
                {t("settings_tab_language")}
              </p>
              <div className="grid grid-cols-4 gap-1">
                {(["en", "uk", "pl", "de"] as Language[]).map((code) => {
                  const flags: Record<Language, string> = { en: "🇬🇧", uk: "🇺🇦", pl: "🇵🇱", de: "🇩🇪" };
                  return (
                    <button
                      key={code}
                      onClick={() => setLanguage(code)}
                      title={code.toUpperCase()}
                      className={cn(
                        "py-1.5 rounded-md text-base border transition-all text-center",
                        language === code
                          ? "border-primary/50 bg-primary/20"
                          : "border-white/5 hover:border-white/20",
                      )}
                    >
                      {flags[code]}
                    </button>
                  );
                })}
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full justify-start text-muted-foreground hover:text-white"
              onClick={() => signOut({ redirectUrl: basePath || "/" })}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              {t("sign_out")}
            </Button>
          </div>
        )}
      </aside>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="hidden md:flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur">
          <h1 className="text-xl font-semibold capitalize">
            {location.replace("/", "").replace(/-/g, " ") || "Dashboard"}
          </h1>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
