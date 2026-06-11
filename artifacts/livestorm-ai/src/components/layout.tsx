import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { useLanguage } from "@/contexts/LanguageContext";
import { LiveSessionProvider } from "@/contexts/LiveSessionContext";
import { type TranslationKey } from "@/lib/i18n";
import { AnimatedBackground, type BgVariant } from "./AnimatedBackground";
import {
  LayoutDashboard, Bot, Sparkles, Radio, BarChart2,
  Settings as SettingsIcon, Gamepad2, LogOut,
  MoreHorizontal, X, ChevronRight, ChevronDown, ChevronLeft,
  Activity, ShieldAlert, Layers, Plug, Cpu, LayoutGrid,
  PanelLeftClose, PanelLeftOpen, Menu,
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

interface NavGroup {
  nameKey: TranslationKey;
  shortNameKey: TranslationKey;
  icon: React.ComponentType<{ className?: string }>;
  testId: string;
  items: NavItem[];
}

const MAIN_NAV: NavItem[] = [
  { nameKey: "nav_dashboard",     shortNameKey: "nav_short_home",    href: "/dashboard",    icon: LayoutDashboard, testId: "dashboard",    shortcut: 1 },
  { nameKey: "nav_ai_assistant",  shortNameKey: "nav_short_ai",      href: "/ai-assistant", icon: Bot,             testId: "ai-assistant", shortcut: 2 },
  { nameKey: "nav_avatar_studio", shortNameKey: "nav_short_avatar",  href: "/avatar-studio",icon: Sparkles,        testId: "avatar-studio",shortcut: 3 },
];

const LIVE_CONTROL_GROUP: NavGroup = {
  nameKey: "nav_live_control",
  shortNameKey: "nav_short_live",
  icon: Radio,
  testId: "live-control",
  items: [
    { nameKey: "nav_lc_overview",    shortNameKey: "nav_short_live", href: "/live-control", icon: LayoutGrid,  testId: "lc-overview" },
    { nameKey: "nav_lc_connection",  shortNameKey: "nav_short_live", href: "/platforms",    icon: Plug,        testId: "lc-connection" },
    { nameKey: "nav_lc_events",      shortNameKey: "nav_short_live", href: "/live-studio",  icon: Activity,    testId: "lc-events" },
    { nameKey: "nav_lc_moderation",  shortNameKey: "nav_short_mod",  href: "/moderation",   icon: ShieldAlert, testId: "lc-moderation" },
    { nameKey: "nav_lc_overlays",    shortNameKey: "nav_short_obs",  href: "/overlays",     icon: Layers,      testId: "lc-overlays" },
    { nameKey: "nav_lc_diagnostics", shortNameKey: "nav_short_live", href: "/live-control/diagnostics", icon: Cpu, testId: "lc-diagnostics" },
  ],
};

const BOTTOM_NAV: NavItem[] = [
  { nameKey: "nav_analytics", shortNameKey: "nav_short_stats",  href: "/analytics", icon: BarChart2,    testId: "analytics", shortcut: 4 },
  { nameKey: "nav_games",     shortNameKey: "nav_short_games",  href: "/games",     icon: Gamepad2,     testId: "games",     shortcut: 5 },
  { nameKey: "nav_settings",  shortNameKey: "nav_settings",     href: "/settings",  icon: SettingsIcon, testId: "settings",  shortcut: 6 },
];

const ALL_MAIN_NAV: NavItem[] = [
  ...MAIN_NAV,
  ...LIVE_CONTROL_GROUP.items,
  ...BOTTOM_NAV,
];

const MOBILE_BOTTOM_4: NavItem[] = [
  MAIN_NAV[0],
  MAIN_NAV[1],
  { nameKey: "nav_live_control", shortNameKey: "nav_short_live", href: "/live-control", icon: Radio, testId: "live-control" },
  BOTTOM_NAV[0],
];

const LIVE_CONTROL_PATHS = LIVE_CONTROL_GROUP.items.map((i) => i.href);

function isLiveControlPath(path: string) {
  return path === "/live-control" || LIVE_CONTROL_PATHS.some((h) => path === h || path.startsWith(h + "/"));
}

function routeVariant(path: string): BgVariant {
  if (path.startsWith("/ai-assistant") || path.startsWith("/avatar-studio")) return "ai";
  if (path.startsWith("/dashboard"))                                          return "dashboard";
  if (path.startsWith("/gamification") || path.startsWith("/boss-battle") || path.startsWith("/games")) return "gamification";
  if (path.startsWith("/mini-games"))                                         return "gaming";
  if (path.startsWith("/universe") || path.startsWith("/kingdom"))           return "universe";
  if (path.startsWith("/live-studio") || path.startsWith("/overlays") || path.startsWith("/automation") || path.startsWith("/live-control")) return "studio";
  if (path.startsWith("/ai-content"))                                         return "content";
  if (path.startsWith("/moderation"))                                         return "moderation";
  return "default";
}

function NavLink({
  item, location, collapsed, onClick, t,
}: {
  item: NavItem;
  location: string;
  collapsed: boolean;
  onClick?: () => void;
  t: (key: TranslationKey) => string;
}) {
  const isActive = location === item.href || (item.href !== "/dashboard" && location.startsWith(item.href + "/"));
  const Icon = item.icon;
  return (
    <Link href={item.href} className="block" onClick={onClick}>
      <div
        data-testid={`link-${item.testId}`}
        title={collapsed ? t(item.nameKey) : undefined}
        className={cn(
          "relative flex items-center rounded-xl cursor-pointer group transition-all duration-150",
          "min-h-[42px]",
          collapsed ? "px-0 justify-center" : "gap-3 px-3",
          isActive
            ? "bg-primary/15 text-sidebar-foreground"
            : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-white/[0.06]",
        )}
      >
        {isActive && !collapsed && (
          <span className="absolute left-0 inset-y-2.5 w-0.5 rounded-full bg-primary" />
        )}
        <Icon className={cn(
          "flex-shrink-0 transition-colors",
          collapsed ? "h-[18px] w-[18px]" : "h-[16px] w-[16px]",
          isActive ? "text-primary" : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70",
        )} />
        {!collapsed && (
          <span className="text-[13px] font-medium whitespace-nowrap flex-1">
            {t(item.nameKey)}
          </span>
        )}
        {!collapsed && item.shortcut && !isActive && (
          <kbd className="text-[9px] text-sidebar-foreground/20 border border-white/[0.07] rounded px-1 font-mono flex-shrink-0">
            ⌘{item.shortcut}
          </kbd>
        )}
        {!collapsed && isActive && (
          <ChevronRight className="h-3 w-3 ml-auto text-primary/50 flex-shrink-0" />
        )}
      </div>
    </Link>
  );
}

function LiveControlGroup({
  location, collapsed, groupOpen, setGroupOpen, onClick, t,
}: {
  location: string;
  collapsed: boolean;
  groupOpen: boolean;
  setGroupOpen: (v: boolean) => void;
  onClick?: () => void;
  t: (key: TranslationKey) => string;
}) {
  const GroupIcon = LIVE_CONTROL_GROUP.icon;
  const isGroupActive = isLiveControlPath(location);

  const handleGroupClick = () => {
    if (collapsed) {
      // In collapsed mode navigate to the overview
      return;
    }
    setGroupOpen(!groupOpen);
  };

  return (
    <div>
      {/* Group header */}
      {collapsed ? (
        <Link href="/live-control" onClick={onClick}>
          <div
            data-testid="link-live-control"
            title={t(LIVE_CONTROL_GROUP.nameKey)}
            className={cn(
              "relative flex items-center justify-center rounded-xl cursor-pointer group transition-all duration-150 min-h-[42px]",
              isGroupActive
                ? "bg-primary/15 text-sidebar-foreground"
                : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-white/[0.06]",
            )}
          >
            <GroupIcon className={cn(
              "h-[18px] w-[18px] flex-shrink-0 transition-colors",
              isGroupActive ? "text-primary" : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70",
            )} />
          </div>
        </Link>
      ) : (
        <button
          data-testid="link-live-control"
          onClick={handleGroupClick}
          className={cn(
            "w-full relative flex items-center gap-3 px-3 rounded-xl cursor-pointer group transition-all duration-150 min-h-[42px]",
            isGroupActive
              ? "bg-primary/15 text-sidebar-foreground"
              : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-white/[0.06]",
          )}
        >
          {isGroupActive && (
            <span className="absolute left-0 inset-y-2.5 w-0.5 rounded-full bg-primary" />
          )}
          <GroupIcon className={cn(
            "h-[16px] w-[16px] flex-shrink-0 transition-colors",
            isGroupActive ? "text-primary" : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70",
          )} />
          <span className="text-[13px] font-medium whitespace-nowrap flex-1 text-left">
            {t(LIVE_CONTROL_GROUP.nameKey)}
          </span>
          <ChevronDown className={cn(
            "h-3.5 w-3.5 flex-shrink-0 transition-transform duration-200",
            groupOpen ? "rotate-180 text-primary/60" : "text-sidebar-foreground/25",
          )} />
        </button>
      )}

      {/* Sub-items */}
      {!collapsed && groupOpen && (
        <div className="mt-0.5 ml-3 pl-3 border-l border-white/[0.07] space-y-0.5">
          {LIVE_CONTROL_GROUP.items.map((item) => {
            const isActive = location === item.href || location.startsWith(item.href + "/");
            const SubIcon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="block" onClick={onClick}>
                <div
                  data-testid={`link-${item.testId}`}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer group transition-all duration-150",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-sidebar-foreground/40 hover:text-sidebar-foreground/80 hover:bg-white/[0.04]",
                  )}
                >
                  <SubIcon className={cn(
                    "h-3.5 w-3.5 flex-shrink-0",
                    isActive ? "text-primary" : "text-sidebar-foreground/30 group-hover:text-sidebar-foreground/60",
                  )} />
                  <span className="text-[12px] font-medium">{t(item.nameKey)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BottomNavLink({
  item, location, t,
}: {
  item: NavItem;
  location: string;
  t: (key: TranslationKey) => string;
}) {
  const isActive = location === item.href || (item.href !== "/dashboard" && location.startsWith(item.href + "/"));
  const Icon = item.icon;
  return (
    <Link href={item.href} className="flex-1">
      <div
        data-testid={`bottom-nav-${item.testId}`}
        className={cn(
          "flex flex-col items-center justify-center gap-1 h-full w-full relative transition-opacity active:opacity-60",
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

function SidebarBrand({ collapsed, basePath }: { collapsed: boolean; basePath: string }) {
  return (
    <div className={cn(
      "flex items-center border-b border-sidebar-border/60 min-h-[64px] overflow-hidden",
      collapsed ? "justify-center px-3" : "gap-3 px-4",
    )}>
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/30 to-cyan-500/20 flex items-center justify-center border border-primary/30 shadow-lg shadow-primary/10 flex-shrink-0">
        <img src={`${basePath}/logo.svg`} alt="LiveStorm AI" className="h-5 w-5" />
      </div>
      {!collapsed && (
        <div className="overflow-hidden">
          <p className="font-bold text-[13px] tracking-tight text-sidebar-foreground leading-none whitespace-nowrap">LiveStorm AI</p>
          <p className="text-[9px] text-sidebar-foreground/35 mt-0.5 tracking-[0.15em] font-semibold whitespace-nowrap uppercase">Creator Platform</p>
        </div>
      )}
    </div>
  );
}

function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div className="my-1 border-t border-white/[0.06]" />;
  return (
    <p className="px-3 pt-4 pb-1.5 text-[9px] font-bold tracking-[0.14em] text-sidebar-foreground/25 uppercase select-none">
      {label}
    </p>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { t } = useLanguage();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  // Desktop collapse state (persisted)
  const [desktopCollapsed, setDesktopCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebar_collapsed") === "1"; } catch { return false; }
  });
  const toggleDesktopCollapse = () => {
    setDesktopCollapsed((v) => {
      const next = !v;
      try { localStorage.setItem("sidebar_collapsed", next ? "1" : "0"); } catch {}
      return next;
    });
  };

  // Tablet overlay expand
  const [tabletExpanded, setTabletExpanded] = useState(false);

  // Live Control group open
  const [liveOpen, setLiveOpen] = useState(() => isLiveControlPath(location));

  // Mobile "more" sheet
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setTabletExpanded(false);
    setMoreOpen(false);
    if (isLiveControlPath(location)) setLiveOpen(true);
  }, [location]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!e.metaKey && !e.ctrlKey) return;
      const n = parseInt(e.key);
      if (n === 1) { e.preventDefault(); setLocation("/dashboard"); }
      if (n === 2) { e.preventDefault(); setLocation("/ai-assistant"); }
      if (n === 3) { e.preventDefault(); setLocation("/avatar-studio"); }
      if (n === 4) { e.preventDefault(); setLocation("/analytics"); }
      if (n === 5) { e.preventDefault(); setLocation("/games"); }
      if (n === 6) { e.preventDefault(); setLocation("/settings"); }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [setLocation]);

  useEffect(() => {
    document.body.style.overflow = moreOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [moreOpen]);

  const relPath = basePath && location.startsWith(basePath)
    ? location.slice(basePath.length) || "/"
    : location;
  const bgVariant = routeVariant(relPath);

  const currentNavItem = ALL_MAIN_NAV.find((i) => i.href === location);
  const currentLabel = currentNavItem
    ? t(currentNavItem.nameKey)
    : isLiveControlPath(location) ? t("nav_live_control") : "Dashboard";

  // Sidebar widths
  const desktopW = desktopCollapsed ? "lg:w-[72px]" : "lg:w-[240px]";
  const tabletW  = tabletExpanded   ? "w-[240px]"   : "w-[72px]";
  const sidebarW = `${tabletW} ${desktopW}`;
  const mainMl   = desktopCollapsed ? "lg:ml-[72px]" : "lg:ml-[240px]";
  const isCollapsed = desktopCollapsed;

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <AnimatedBackground variant={bgVariant} />

      {/* Tablet backdrop */}
      {tabletExpanded && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm hidden md:block lg:hidden"
          onClick={() => setTabletExpanded(false)}
        />
      )}

      {/* ── SIDEBAR (md+) ── */}
      <aside className={cn(
        "hidden md:flex flex-col fixed inset-y-0 left-0 z-50",
        "bg-sidebar border-r border-sidebar-border",
        "transition-all duration-300 ease-in-out",
        sidebarW,
      )}>

        <SidebarBrand
          collapsed={tabletExpanded ? false : isCollapsed}
          basePath={basePath}
        />

        {/* Tablet toggle */}
        <div className="lg:hidden px-2 py-2 border-b border-sidebar-border/30">
          <button
            onClick={() => setTabletExpanded((e) => !e)}
            className={cn(
              "w-full flex items-center rounded-lg p-2.5 min-h-[40px] transition-colors",
              "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-white/[0.06]",
              tabletExpanded ? "justify-start gap-2 px-3" : "justify-center",
            )}
          >
            {tabletExpanded
              ? <><ChevronLeft className="h-4 w-4 flex-shrink-0" /><span className="text-[12px] font-medium">{t("nav_collapse")}</span></>
              : <Menu className="h-4 w-4" />
            }
          </button>
        </div>

        {/* Nav scroll area */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 scrollbar-thin scrollbar-thumb-white/5">

          {/* Primary nav */}
          {MAIN_NAV.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              location={location}
              collapsed={tabletExpanded ? false : isCollapsed}
              onClick={() => setTabletExpanded(false)}
              t={t}
            />
          ))}

          {/* Live Control group */}
          <LiveControlGroup
            location={location}
            collapsed={tabletExpanded ? false : isCollapsed}
            groupOpen={liveOpen}
            setGroupOpen={setLiveOpen}
            onClick={() => setTabletExpanded(false)}
            t={t}
          />

          <SectionLabel label={t("nav_section_platform")} collapsed={tabletExpanded ? false : isCollapsed} />

          {/* Bottom nav items */}
          {BOTTOM_NAV.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              location={location}
              collapsed={tabletExpanded ? false : isCollapsed}
              onClick={() => setTabletExpanded(false)}
              t={t}
            />
          ))}
        </nav>

        {/* Desktop collapse toggle */}
        <div className="hidden lg:block border-t border-sidebar-border/40 px-2 py-2">
          <button
            onClick={toggleDesktopCollapse}
            className={cn(
              "w-full flex items-center rounded-lg p-2.5 transition-colors",
              "text-sidebar-foreground/35 hover:text-sidebar-foreground/70 hover:bg-white/[0.05]",
              isCollapsed ? "justify-center" : "gap-2.5 px-3",
            )}
            title={isCollapsed ? t("nav_expand") : t("nav_collapse")}
          >
            {isCollapsed
              ? <PanelLeftOpen className="h-4 w-4" />
              : <><PanelLeftClose className="h-4 w-4 flex-shrink-0" /><span className="text-[11px] font-medium">{t("nav_collapse")}</span></>
            }
          </button>
        </div>

        {/* User area */}
        {user && (
          <div className="border-t border-sidebar-border/60 px-2 py-2">
            <div className={cn(
              "flex items-center rounded-xl bg-sidebar-accent border border-sidebar-border/40",
              (tabletExpanded || !isCollapsed) ? "gap-2.5 p-2" : "p-1.5 justify-center",
            )}>
              <Avatar className="h-8 w-8 border border-sidebar-border flex-shrink-0">
                <AvatarImage src={user.imageUrl} />
                <AvatarFallback className="text-xs bg-primary/20 text-primary">
                  {user.firstName?.charAt(0) ?? "U"}
                </AvatarFallback>
              </Avatar>
              {(tabletExpanded || !isCollapsed) && (
                <>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-[12px] font-semibold text-sidebar-foreground truncate leading-none">{user.fullName || "Creator"}</p>
                    <p className="text-[10px] text-sidebar-foreground/45 truncate mt-0.5">{user.primaryEmailAddress?.emailAddress}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-sidebar-foreground/40 hover:text-red-400 hover:bg-red-500/10 flex-shrink-0"
                    onClick={() => signOut({ redirectUrl: basePath || "/" })}
                    data-testid="button-logout"
                    title={t("sign_out")}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300 relative z-[1]",
        "md:ml-[72px]",
        mainMl,
      )}>
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-sidebar-border bg-sidebar sticky top-0 z-30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/30 to-cyan-500/20 flex items-center justify-center border border-primary/25 flex-shrink-0">
              <img src={`${basePath}/logo.svg`} alt="LiveStorm AI" className="h-5 w-5" />
            </div>
            <span className="font-bold text-[15px] tracking-tight text-sidebar-foreground">LiveStorm AI</span>
          </div>
          <span className="text-[10px] text-muted-foreground/40 font-bold tracking-widest uppercase">Creator Platform</span>
        </header>

        {/* Desktop top bar */}
        <header className="hidden md:flex items-center justify-between px-6 py-3.5 border-b border-border/60 bg-background/70 backdrop-blur-sm sticky top-0 z-20">
          <h1 className="text-[13px] font-semibold text-foreground/80 tracking-wide">{currentLabel}</h1>
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-1.5 text-[10px] text-muted-foreground/30 font-mono">
              <kbd className="border border-border/50 rounded px-1">⌘1</kbd>
              <span>–</span>
              <kbd className="border border-border/50 rounded px-1">⌘6</kbd>
              <span className="font-sans ml-0.5 text-muted-foreground/25">navigate</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 md:p-6 pb-24 md:pb-6">
          <LiveSessionProvider>
            {children}
          </LiveSessionProvider>
        </main>
      </div>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-sidebar border-t border-sidebar-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex h-16">
          {MOBILE_BOTTOM_4.map((item) => (
            <BottomNavLink key={item.href} item={item} location={location} t={t} />
          ))}
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

      {/* ── MOBILE "MORE" SHEET ── */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
          <div className="relative w-full bg-sidebar rounded-t-2xl border-t border-sidebar-border shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            <div className="px-4 pb-8">
              <div className="flex items-center justify-between py-3 mb-3 border-b border-sidebar-border/50">
                <h3 className="text-sm font-semibold text-sidebar-foreground">{t("nav_navigation")}</h3>
                <button onClick={() => setMoreOpen(false)} className="p-2 rounded-lg text-sidebar-foreground/50 hover:bg-white/5">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {[...MAIN_NAV, ...BOTTOM_NAV].map((item) => {
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

              <div className="mb-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-sidebar-foreground/30 mb-2">{t("nav_live_control")}</p>
                <div className="grid grid-cols-3 gap-2">
                  {LIVE_CONTROL_GROUP.items.map((item) => {
                    const isActive = location === item.href;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.href}
                        onClick={() => { setLocation(item.href); setMoreOpen(false); }}
                        className={cn(
                          "flex flex-col items-center gap-2 p-3 rounded-xl border min-h-[70px] justify-center transition-all active:scale-95",
                          isActive
                            ? "bg-primary/15 border-primary/30 text-sidebar-foreground"
                            : "bg-white/[0.04] border-white/[0.05] text-sidebar-foreground/40",
                        )}
                      >
                        <Icon className={cn("h-4 w-4", isActive && "text-primary")} />
                        <span className="text-[10px] font-medium text-center leading-tight">{t(item.nameKey)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {user && (
                <div className="border-t border-sidebar-border/50 pt-4">
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
                      variant="ghost" size="icon"
                      className="h-10 w-10 text-sidebar-foreground/50 hover:text-red-400 hover:bg-red-500/10 flex-shrink-0"
                      onClick={() => { signOut({ redirectUrl: basePath || "/" }); setMoreOpen(false); }}
                      title={t("sign_out")}
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
