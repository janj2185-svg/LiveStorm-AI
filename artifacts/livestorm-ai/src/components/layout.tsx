import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { useLanguage } from "@/contexts/LanguageContext";
import { type TranslationKey } from "@/lib/i18n";
import {
  LayoutDashboard, Bot, Sword, Trophy, ShieldAlert, BarChart2,
  Settings as SettingsIcon, Video, Zap, Layers, Wand2, Castle,
  Gamepad2, LogOut, ChevronLeft, ChevronRight, Menu, X,
  MoreHorizontal, Globe, Plug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface NavItem {
  nameKey: TranslationKey;
  shortNameKey: TranslationKey;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  testId: string;
  shortcut?: number;
}

const PRIMARY_NAV: NavItem[] = [
  { nameKey: "nav_dashboard",    shortNameKey: "nav_short_home",      href: "/dashboard",    icon: LayoutDashboard, testId: "dashboard",    shortcut: 1 },
  { nameKey: "nav_ai_assistant", shortNameKey: "nav_short_ai",        href: "/ai-assistant", icon: Bot,             testId: "ai-assistant", shortcut: 2 },
  { nameKey: "nav_boss_battle",  shortNameKey: "nav_short_boss",      href: "/boss-battle",  icon: Sword,           testId: "boss-battle",  shortcut: 3 },
  { nameKey: "nav_gamification", shortNameKey: "nav_short_xp",        href: "/gamification", icon: Trophy,          testId: "gamification", shortcut: 4 },
  { nameKey: "nav_moderation",   shortNameKey: "nav_short_mod",       href: "/moderation",   icon: ShieldAlert,     testId: "moderation",   shortcut: 5 },
  { nameKey: "nav_analytics",    shortNameKey: "nav_short_stats",     href: "/analytics",    icon: BarChart2,       testId: "analytics",    shortcut: 6 },
  { nameKey: "nav_settings",     shortNameKey: "nav_settings",        href: "/settings",     icon: SettingsIcon,    testId: "settings",     shortcut: 7 },
];

const SECONDARY_NAV: NavItem[] = [
  { nameKey: "nav_live_studio",  shortNameKey: "nav_short_studio",    href: "/live-studio", icon: Video,    testId: "live-studio" },
  { nameKey: "nav_automation",   shortNameKey: "nav_short_auto",      href: "/automation",  icon: Zap,      testId: "automation" },
  { nameKey: "nav_overlays",     shortNameKey: "nav_short_obs",       href: "/overlays",    icon: Layers,   testId: "overlays" },
  { nameKey: "nav_ai_content",   shortNameKey: "nav_short_content",   href: "/ai-content",  icon: Wand2,    testId: "ai-content" },
  { nameKey: "nav_kingdom",      shortNameKey: "nav_short_kingdom",   href: "/kingdom",     icon: Castle,   testId: "kingdom" },
  { nameKey: "nav_mini_games",   shortNameKey: "nav_short_games",     href: "/mini-games",  icon: Gamepad2, testId: "mini-games" },
  { nameKey: "nav_universe",     shortNameKey: "nav_short_universe",  href: "/universe",    icon: Globe,    testId: "universe" },
  { nameKey: "nav_platforms",    shortNameKey: "nav_short_platforms", href: "/platforms",   icon: Plug,     testId: "platforms" },
];

const BOTTOM_NAV_ITEMS = PRIMARY_NAV.slice(0, 4);
const ALL_NAV = [...PRIMARY_NAV, ...SECONDARY_NAV];

function SidebarLink({
  item, location, expanded, onClick, t,
}: {
  item: NavItem;
  location: string;
  expanded: boolean;
  onClick?: () => void;
  t: (key: TranslationKey) => string;
}) {
  const isActive = location === item.href;
  const Icon = item.icon;
  return (
    <Link href={item.href} className="block" onClick={onClick}>
      <div
        data-testid={`link-${item.testId}`}
        title={t(item.nameKey)}
        className={cn(
          "relative flex items-center gap-3 rounded-lg cursor-pointer group",
          "transition-all duration-150 min-h-[44px]",
          expanded ? "px-3" : "px-0 justify-center lg:justify-start lg:px-3",
          isActive
            ? "bg-primary/15 text-sidebar-foreground"
            : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-white/5",
        )}
      >
        {isActive && (
          <span className={cn(
            "absolute left-0 inset-y-2 w-0.5 rounded-full bg-primary",
            expanded ? "block" : "hidden lg:block",
          )} />
        )}
        <Icon className={cn(
          "flex-shrink-0 transition-colors",
          expanded ? "h-4 w-4" : "h-5 w-5 lg:h-4 lg:w-4",
          isActive ? "text-primary" : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70",
        )} />
        <span className={cn(
          "text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-200",
          expanded ? "opacity-100 max-w-[160px]" : "opacity-0 max-w-0 lg:opacity-100 lg:max-w-[160px]",
        )}>
          {t(item.nameKey)}
        </span>
        {item.shortcut && !isActive && (
          <kbd className={cn(
            "text-[9px] text-sidebar-foreground/20 border border-white/5 rounded px-1 font-mono flex-shrink-0",
            expanded ? "flex" : "hidden lg:flex",
          )}>
            ⌘{item.shortcut}
          </kbd>
        )}
        {isActive && (
          <ChevronRight className={cn(
            "h-3 w-3 ml-auto text-primary/60 flex-shrink-0",
            expanded ? "block" : "hidden lg:block",
          )} />
        )}
      </div>
    </Link>
  );
}

function BottomNavLink({
  item, location, t,
}: {
  item: NavItem;
  location: string;
  t: (key: TranslationKey) => string;
}) {
  const isActive = location === item.href;
  const Icon = item.icon;
  return (
    <Link href={item.href} className="flex-1">
      <div
        data-testid={`bottom-nav-${item.testId}`}
        className={cn(
          "flex flex-col items-center justify-center gap-1 h-full w-full relative",
          "transition-opacity active:opacity-60",
          isActive ? "text-primary" : "text-sidebar-foreground/50",
        )}
      >
        {isActive && (
          <span className="absolute top-0 inset-x-0 flex justify-center">
            <span className="w-8 h-0.5 rounded-full bg-primary block" />
          </span>
        )}
        <Icon className="h-5 w-5" />
        <span className="text-[10px] font-medium leading-none">{t(item.shortNameKey)}</span>
      </div>
    </Link>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { t } = useLanguage();
  const [tabletExpanded, setTabletExpanded] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  const currentNavItem = ALL_NAV.find(i => i.href === location);

  useEffect(() => {
    setTabletExpanded(false);
    setMoreOpen(false);
  }, [location]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!e.metaKey && !e.ctrlKey) return;
      const n = parseInt(e.key);
      if (n >= 1 && n <= 7) {
        e.preventDefault();
        setLocation(PRIMARY_NAV[n - 1].href);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [setLocation]);

  useEffect(() => {
    if (moreOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [moreOpen]);

  const sidebarWClass = tabletExpanded ? "w-60" : "w-16 lg:w-60";
  const mainMlClass  = tabletExpanded ? "md:ml-0" : "md:ml-16 lg:ml-60";

  return (
    <div className="min-h-screen bg-background text-foreground flex">

      {/* Tablet overlay backdrop */}
      {tabletExpanded && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm hidden md:block lg:hidden"
          onClick={() => setTabletExpanded(false)}
        />
      )}

      {/* ─── SIDEBAR (md+) ─── */}
      <aside className={cn(
        "hidden md:flex flex-col fixed inset-y-0 left-0 z-50",
        "bg-sidebar border-r border-sidebar-border",
        "transition-all duration-300 ease-in-out",
        sidebarWClass,
      )}>
        {/* Brand */}
        <div className={cn(
          "flex items-center gap-3 border-b border-sidebar-border/60 min-h-[64px] overflow-hidden",
          tabletExpanded ? "px-4" : "px-2 justify-center lg:justify-start lg:px-4",
        )}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/40 to-accent/30 flex items-center justify-center border border-primary/30 shadow-lg shadow-primary/10 flex-shrink-0">
            <img src={`${basePath}/logo.svg`} alt="LiveStorm AI" className="h-5 w-5" />
          </div>
          <div className={cn(
            "overflow-hidden transition-all duration-200",
            tabletExpanded ? "opacity-100 w-auto" : "opacity-0 w-0 lg:opacity-100 lg:w-auto",
          )}>
            <p className="font-bold text-sm tracking-tight text-sidebar-foreground leading-none whitespace-nowrap">LiveStorm AI</p>
            <p className="text-[10px] text-sidebar-foreground/40 mt-0.5 tracking-wider whitespace-nowrap">CREATOR PLATFORM</p>
          </div>
        </div>

        {/* Tablet toggle */}
        <div className="lg:hidden px-2 py-2 border-b border-sidebar-border/30">
          <button
            onClick={() => setTabletExpanded(e => !e)}
            className={cn(
              "w-full flex items-center rounded-lg p-2 min-h-[40px] transition-colors",
              "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-white/5",
              tabletExpanded ? "justify-start gap-2 px-3" : "justify-center",
            )}
          >
            {tabletExpanded
              ? <><ChevronLeft className="h-4 w-4 flex-shrink-0" /><span className="text-xs font-medium">{t("nav_collapse")}</span></>
              : <Menu className="h-4 w-4" />
            }
          </button>
        </div>

        {/* Primary nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {PRIMARY_NAV.map(item => (
            <SidebarLink
              key={item.href}
              item={item}
              location={location}
              expanded={tabletExpanded}
              onClick={() => setTabletExpanded(false)}
              t={t}
            />
          ))}

          {/* Secondary nav — visible when expanded or on desktop */}
          <div className={cn(
            "pt-4 transition-all duration-200 overflow-hidden",
            tabletExpanded ? "max-h-screen opacity-100" : "max-h-0 opacity-0 lg:max-h-screen lg:opacity-100",
          )}>
            <p className="px-3 pb-2 text-[9px] font-semibold tracking-[0.12em] text-sidebar-foreground/30 uppercase select-none">
              {t("nav_more_tools")}
            </p>
            {SECONDARY_NAV.map(item => (
              <SidebarLink
                key={item.href}
                item={item}
                location={location}
                expanded={true}
                onClick={() => setTabletExpanded(false)}
                t={t}
              />
            ))}
          </div>
        </nav>

        {/* User area */}
        {user && (
          <div className="border-t border-sidebar-border/60">
            <div className={cn(
              "flex items-center gap-2.5 rounded-lg bg-sidebar-accent border border-sidebar-border/50 m-2",
              tabletExpanded ? "p-2" : "p-1.5 justify-center lg:p-2",
            )}>
              <Avatar className="h-8 w-8 border border-sidebar-border flex-shrink-0">
                <AvatarImage src={user.imageUrl} />
                <AvatarFallback className="text-xs bg-primary/20 text-primary">
                  {user.firstName?.charAt(0) ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div className={cn(
                "flex-1 min-w-0 overflow-hidden transition-all duration-200",
                tabletExpanded ? "opacity-100 max-w-[120px]" : "opacity-0 max-w-0 lg:opacity-100 lg:max-w-[120px]",
              )}>
                <p className="text-xs font-semibold text-sidebar-foreground truncate leading-none">{user.fullName || "Creator"}</p>
                <p className="text-[10px] text-sidebar-foreground/50 truncate mt-0.5">{user.primaryEmailAddress?.emailAddress}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-7 w-7 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-red-500/10 flex-shrink-0",
                  tabletExpanded ? "flex" : "hidden lg:flex",
                )}
                onClick={() => signOut({ redirectUrl: basePath || "/" })}
                data-testid="button-logout"
                title={t("sign_out")}
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </aside>

      {/* ─── MAIN CONTENT ─── */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300",
        mainMlClass,
      )}>
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-sidebar-border bg-sidebar sticky top-0 z-30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30 flex-shrink-0">
              <img src={`${basePath}/logo.svg`} alt="LiveStorm AI" className="h-5 w-5" />
            </div>
            <span className="font-bold text-base tracking-tight text-sidebar-foreground">LiveStorm AI</span>
          </div>
          <span className="flex items-center gap-1.5 text-[11px] text-green-400/80">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
            {t("analytics_live_now")}
          </span>
        </header>

        {/* Desktop/tablet top bar */}
        <header className="hidden md:flex items-center justify-between px-6 py-3.5 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-20">
          <h1 className="text-sm font-semibold text-foreground tracking-wide">
            {currentNavItem ? t(currentNavItem.nameKey) : "Dashboard"}
          </h1>
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-muted-foreground/40 font-mono">
              <kbd className="border border-border rounded px-1">⌘1</kbd>
              <span>–</span>
              <kbd className="border border-border rounded px-1">⌘7</kbd>
              <span className="font-sans ml-0.5">navigate</span>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500/80 inline-block" />
              {t("status_operational")}
            </span>
          </div>
        </header>

        {/* Page content — extra bottom padding on mobile for bottom nav */}
        <main className="flex-1 overflow-auto p-4 md:p-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>

      {/* ─── MOBILE BOTTOM NAV ─── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-sidebar border-t border-sidebar-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex h-16">
          {BOTTOM_NAV_ITEMS.map(item => (
            <BottomNavLink key={item.href} item={item} location={location} t={t} />
          ))}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-1 h-full text-sidebar-foreground/50 active:opacity-60 transition-opacity"
            aria-label={t("nav_navigation")}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-none">{t("nav_more")}</span>
          </button>
        </div>
      </nav>

      {/* ─── MOBILE "MORE" SHEET ─── */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />
          {/* Sheet */}
          <div className="relative w-full bg-sidebar rounded-t-2xl border-t border-sidebar-border shadow-2xl max-h-[80vh] overflow-y-auto">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            <div className="px-4 pb-8">
              {/* Header */}
              <div className="flex items-center justify-between py-3 mb-3 border-b border-sidebar-border/50">
                <h3 className="text-sm font-semibold text-sidebar-foreground">{t("nav_navigation")}</h3>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="p-2 rounded-lg text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-white/5 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Primary items not in bottom nav: Moderation, Analytics, Settings */}
              <div className="mb-5">
                <p className="text-[9px] font-semibold text-sidebar-foreground/30 uppercase tracking-[0.12em] mb-3">{t("nav_section_main")}</p>
                <div className="grid grid-cols-3 gap-2">
                  {PRIMARY_NAV.slice(4).map(item => {
                    const isActive = location === item.href;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.href}
                        onClick={() => { setLocation(item.href); setMoreOpen(false); }}
                        data-testid={`more-nav-${item.testId}`}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-xl border min-h-[80px] justify-center transition-all active:scale-95",
                          isActive
                            ? "bg-primary/15 border-primary/30 text-sidebar-foreground"
                            : "bg-white/5 border-white/5 text-sidebar-foreground/50",
                        )}
                      >
                        <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
                        <span className="text-[11px] font-medium text-center leading-tight">{t(item.shortNameKey)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Secondary tools */}
              <div className="mb-5">
                <p className="text-[9px] font-semibold text-sidebar-foreground/30 uppercase tracking-[0.12em] mb-3">{t("nav_section_tools")}</p>
                <div className="grid grid-cols-3 gap-2">
                  {SECONDARY_NAV.map(item => {
                    const isActive = location === item.href;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.href}
                        onClick={() => { setLocation(item.href); setMoreOpen(false); }}
                        data-testid={`more-nav-${item.testId}`}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-xl border min-h-[80px] justify-center transition-all active:scale-95",
                          isActive
                            ? "bg-primary/15 border-primary/30 text-sidebar-foreground"
                            : "bg-white/5 border-white/5 text-sidebar-foreground/50",
                        )}
                      >
                        <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
                        <span className="text-[11px] font-medium text-center leading-tight">{t(item.shortNameKey)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* User */}
              <div className="border-t border-sidebar-border/50 pt-4">
                {user && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent border border-sidebar-border/50">
                    <Avatar className="h-10 w-10 border border-sidebar-border flex-shrink-0">
                      <AvatarImage src={user.imageUrl} />
                      <AvatarFallback className="text-sm bg-primary/20 text-primary">
                        {user.firstName?.charAt(0) ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-sidebar-foreground truncate">{user.fullName || "Creator"}</p>
                      <p className="text-xs text-sidebar-foreground/50 truncate">{user.primaryEmailAddress?.emailAddress}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-sidebar-foreground/50 hover:text-red-400 hover:bg-red-500/10 flex-shrink-0"
                      onClick={() => { signOut({ redirectUrl: basePath || "/" }); setMoreOpen(false); }}
                      title={t("sign_out")}
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
