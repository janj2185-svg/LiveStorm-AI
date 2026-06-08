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
  Plug,
  UserCircle,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/contexts/LanguageContext";
import { type Language } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  testId: string;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { t, language, setLanguage } = useLanguage();

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  const NAV_GROUPS: NavGroup[] = [
    {
      items: [
        { name: t("nav_dashboard"),   href: "/dashboard",   icon: LayoutDashboard, testId: "dashboard" },
        { name: t("nav_live_studio"), href: "/live-studio",  icon: Video,           testId: "live-studio" },
        { name: "Platforms",          href: "/platforms",    icon: Plug,            testId: "platforms" },
      ],
    },
    {
      label: "ENGAGEMENT",
      items: [
        { name: t("nav_gamification"), href: "/gamification", icon: Trophy,    testId: "gamification" },
        { name: t("nav_boss_battle"),  href: "/boss-battle",  icon: Sword,     testId: "boss-battle" },
        { name: t("nav_kingdom"),      href: "/kingdom",      icon: Castle,    testId: "kingdom" },
        { name: t("nav_mini_games"),   href: "/mini-games",   icon: Gamepad2,  testId: "mini-games" },
        { name: t("nav_universe"),     href: "/universe",     icon: Globe,     testId: "universe" },
      ],
    },
    {
      label: "CONTENT",
      items: [
        { name: t("nav_automation"),   href: "/automation",   icon: Zap,    testId: "automation" },
        { name: t("nav_overlays"),     href: "/overlays",     icon: Layers, testId: "overlays" },
        { name: t("nav_ai_assistant"), href: "/ai-assistant", icon: Bot,    testId: "ai-assistant" },
        { name: t("nav_ai_content"),   href: "/ai-content",   icon: Wand2,  testId: "ai-content" },
      ],
    },
    {
      label: "ACCOUNT",
      items: [
        { name: t("nav_analytics"), href: "/analytics", icon: BarChart2,    testId: "analytics" },
        { name: "Profile",          href: "/profile",   icon: UserCircle,   testId: "profile" },
        { name: t("nav_settings"),  href: "/settings",  icon: SettingsIcon, testId: "settings" },
      ],
    },
  ];

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-sidebar">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
            <img src={`${basePath}/logo.svg`} alt="LiveStorm AI" className="h-5 w-5" />
          </div>
          <span className="font-bold text-base tracking-tight text-white">LiveStorm AI</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-white"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </header>

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-60 bg-sidebar border-r border-sidebar-border",
          "flex flex-col transform transition-transform duration-300 ease-in-out",
          "md:relative md:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Brand */}
        <div className="hidden md:flex items-center gap-3 px-5 py-5 border-b border-sidebar-border/60">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/40 to-accent/30 flex items-center justify-center border border-primary/30 shadow-lg shadow-primary/10">
            <img src={`${basePath}/logo.svg`} alt="LiveStorm AI" className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold text-sm tracking-tight text-white leading-none">LiveStorm AI</p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5 tracking-wider">CREATOR PLATFORM</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi} className={gi > 0 ? "pt-3" : ""}>
              {group.label && (
                <p className="px-3 pb-1.5 text-[9px] font-semibold tracking-[0.12em] text-muted-foreground/50 uppercase select-none">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = location === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block"
                      onClick={closeSidebar}
                    >
                      <div
                        data-testid={`link-${item.testId}`}
                        className={cn(
                          "relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium",
                          "transition-all duration-150 cursor-pointer group",
                          isActive
                            ? "bg-primary/15 text-white"
                            : "text-muted-foreground hover:text-white hover:bg-white/5",
                        )}
                      >
                        {isActive && (
                          <span className="absolute left-0 inset-y-1 w-0.5 rounded-full bg-primary" />
                        )}
                        <Icon
                          className={cn(
                            "h-4 w-4 flex-shrink-0 transition-colors",
                            isActive ? "text-primary" : "text-muted-foreground group-hover:text-white/70",
                          )}
                        />
                        <span className="truncate">{item.name}</span>
                        {isActive && (
                          <ChevronRight className="h-3 w-3 ml-auto text-primary/60 flex-shrink-0" />
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User area */}
        {user && (
          <div className="border-t border-sidebar-border/60 p-3 space-y-3">
            {/* Language switcher */}
            <div>
              <p className="text-[9px] font-semibold text-muted-foreground/50 uppercase tracking-[0.12em] mb-1.5 px-1">
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
                        "py-1.5 rounded-md text-sm border transition-all text-center",
                        language === code
                          ? "border-primary/50 bg-primary/15 shadow-sm shadow-primary/20"
                          : "border-white/5 hover:border-white/15 hover:bg-white/5",
                      )}
                    >
                      {flags[code]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Profile row */}
            <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white/5 border border-white/5">
              <Avatar className="h-8 w-8 border border-white/10 flex-shrink-0">
                <AvatarImage src={user.imageUrl} />
                <AvatarFallback className="text-xs bg-primary/20 text-primary">
                  {user.firstName?.charAt(0) ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate leading-none">
                  {user.fullName || "Creator"}
                </p>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                  {user.primaryEmailAddress?.emailAddress}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-white hover:bg-red-500/10 flex-shrink-0"
                onClick={() => signOut({ redirectUrl: basePath || "/" })}
                data-testid="button-logout"
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="hidden md:flex items-center justify-between px-6 py-3.5 border-b border-border bg-card/30 backdrop-blur-sm">
          <h1 className="text-sm font-semibold text-white capitalize tracking-wide">
            {location.replace("/", "").replace(/-/g, " ") || "Dashboard"}
          </h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500/80 inline-block" />
            System operational
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
