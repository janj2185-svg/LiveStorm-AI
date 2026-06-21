import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { useLanguage } from "@/contexts/LanguageContext";
import { LiveSessionProvider } from "@/contexts/LiveSessionContext";
import { AnimatedBackground, type BgVariant } from "./AnimatedBackground";
import {
  LayoutDashboard, Bot, BarChart2,
  Settings as SettingsIcon, LogOut,
  MoreHorizontal, X, Monitor, Film, Gift, Users,
  ShieldCheck, PanelLeftClose, PanelLeftOpen, Menu, ChevronLeft, Swords,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface SimpleNavItem {
  labelKey: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SIDEBAR_ITEMS: SimpleNavItem[] = [
  { labelKey: "nav_dashboard",   href: "/dashboard",    icon: LayoutDashboard },
  { labelKey: "nav_live_studio", href: "/live-studio",  icon: Monitor },
  { labelKey: "nav_scenes",      href: "/live-control", icon: Film },
  { labelKey: "nav_gifts",       href: "/gamification", icon: Gift },
  { labelKey: "nav_community",   href: "/universe",     icon: Users },
  { labelKey: "nav_ai_storm",    href: "/ai-assistant", icon: Bot },
  { labelKey: "nav_storm_pass",  href: "/pass",         icon: ShieldCheck },
  { labelKey: "nav_boss_battle", href: "/boss-battle",  icon: Swords },
];

const SIDEBAR_BOTTOM: SimpleNavItem[] = [
  { labelKey: "nav_analytics", href: "/analytics", icon: BarChart2 },
  { labelKey: "nav_settings",  href: "/settings",  icon: SettingsIcon },
];

const ALL_NAV = [...SIDEBAR_ITEMS, ...SIDEBAR_BOTTOM];

function isNavActive(href: string, location: string): boolean {
  if (href === "/dashboard") return location === "/dashboard" || location === "/";
  return location === href || location.startsWith(href + "/");
}

function routeVariant(path: string): BgVariant {
  if (path.startsWith("/ai-assistant") || path.startsWith("/avatar-studio")) return "ai";
  if (path.startsWith("/dashboard") || path === "/" || path === "") return "dashboard";
  if (path.startsWith("/boss-battle")) return "battle";
  if (path.startsWith("/gamification") || path.startsWith("/games")) return "gamification";
  if (path.startsWith("/mini-games")) return "gaming";
  if (path.startsWith("/universe") || path.startsWith("/kingdom")) return "universe";
  if (path.startsWith("/live-studio") || path.startsWith("/overlays") || path.startsWith("/automation")) return "studio";
  if (path.startsWith("/live-control")) return "scenes";
  if (path.startsWith("/analytics")) return "analytics";
  if (path.startsWith("/pass")) return "pass";
  if (path.startsWith("/ai-content")) return "content";
  if (path.startsWith("/moderation")) return "moderation";
  return "default";
}

function SidebarNavItem({
  item, location, collapsed, onClick, t,
}: {
  item: SimpleNavItem;
  location: string;
  collapsed: boolean;
  onClick?: () => void;
  t: (k: string) => string;
}) {
  const active = isNavActive(item.href, location);
  const Icon = item.icon;
  const label = t(item.labelKey);
  return (
    <Link href={item.href} className="block" onClick={onClick}>
      <div
        data-testid={`link-${item.href.replace(/\//g, "")}`}
        title={collapsed ? label : undefined}
        className={cn(
          "relative flex items-center rounded-xl cursor-pointer min-h-[40px]",
          "transition-all duration-200",
          collapsed ? "px-0 justify-center" : "gap-3 px-3",
          active
            ? "bg-white/78 border border-sky-200 text-slate-950 shadow-[0_14px_34px_rgba(56,189,248,.14)]"
            : "border border-transparent text-slate-600 hover:text-slate-950 hover:bg-white/64",
        )}
        style={active ? {
          boxShadow: "0 16px 38px rgba(56,189,248,0.15), inset 0 1px 0 rgba(255,255,255,.9)",
        } : undefined}
      >
        {active && !collapsed && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] h-4 rounded-r-full bg-amber-400" />
        )}
        <Icon className={cn(
          "flex-shrink-0 transition-colors duration-200",
          collapsed ? "h-[21px] w-[21px]" : "h-[18px] w-[18px]",
          active ? "text-sky-500" : "text-slate-500",
        )} />
        {!collapsed && (
          <span className="text-[14px] font-semibold whitespace-nowrap flex-1 leading-none tracking-[-0.01em]">
            {label}
          </span>
        )}
        {!collapsed && active && (
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" style={{ boxShadow: "0 0 8px rgba(251,191,36,0.8)" }} />
        )}
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
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

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

  const [tabletExpanded, setTabletExpanded] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setTabletExpanded(false);
    setMoreOpen(false);
  }, [location]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!e.metaKey && !e.ctrlKey) return;
      if (e.key === "1") { e.preventDefault(); setLocation("/dashboard"); }
      if (e.key === "2") { e.preventDefault(); setLocation("/ai-assistant"); }
      if (e.key === "3") { e.preventDefault(); setLocation("/avatar-studio"); }
      if (e.key === "4") { e.preventDefault(); setLocation("/analytics"); }
      if (e.key === "5") { e.preventDefault(); setLocation("/settings"); }
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

  const sidebarCollapsed = tabletExpanded ? false : desktopCollapsed;
  const desktopW = desktopCollapsed ? "lg:w-[72px]" : "lg:w-[236px]";
  const tabletW  = tabletExpanded   ? "w-[236px]"   : "w-[72px]";
  const sidebarW = `${tabletW} ${desktopW}`;
  const mainMl   = desktopCollapsed ? "lg:ml-[72px]" : "lg:ml-[236px]";

  const currentItem  = ALL_NAV.find((i) => isNavActive(i.href, relPath));
  const currentLabel = currentItem ? t(currentItem.labelKey as any) : t("nav_dashboard");

  return (
    <div className="storm-composer-shell min-h-screen bg-background text-foreground flex">
      <AnimatedBackground variant={bgVariant} />

      {tabletExpanded && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/18 backdrop-blur-sm hidden md:block lg:hidden"
          onClick={() => setTabletExpanded(false)}
        />
      )}

      {/* ── SIDEBAR ── */}
      <aside
        className={cn(
          "hidden md:flex flex-col fixed inset-y-0 left-0 z-50",
          "border-r border-white/75 shadow-[18px_0_70px_rgba(56,119,182,.10)]",
          "transition-all duration-300 ease-in-out",
          sidebarW,
        )}
        style={{
          backgroundImage:
            "linear-gradient(180deg,rgba(255,255,255,.86),rgba(224,242,254,.66) 46%,rgba(254,243,199,.42))",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backdropFilter: "blur(28px) saturate(150%)",
        }}
      >

        {/* Brand */}
        <div className={cn(
          "flex items-center gap-3 border-b border-white/70 min-h-[68px] flex-shrink-0 relative",
          sidebarCollapsed ? "justify-center px-3" : "px-4",
        )}>
          <div className={cn(
            "w-12 h-12 rounded-2xl bg-gradient-to-br from-white via-sky-100 to-amber-100 flex items-center justify-center",
            "border border-white/80 shadow-lg flex-shrink-0",
          )} style={{ boxShadow: "0 16px 36px rgba(56,189,248,0.18), inset 0 1px 0 rgba(255,255,255,.9)" }}>
            <img src={`${basePath}/logo.svg`} alt="LiveStorm AI" className="h-7 w-7" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="font-black text-[15px] tracking-tight text-slate-950 leading-none whitespace-nowrap">
                LiveStorm <span className="text-sky-500">AI</span>
              </p>
              <p className="text-[9px] text-amber-500 mt-1 tracking-[0.18em] font-black whitespace-nowrap uppercase">
                Storm Companion Studio
              </p>
            </div>
          )}

          {/* Tablet collapse button */}
          {!sidebarCollapsed && (
            <button
              className="lg:hidden flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-white/70 transition-colors flex-shrink-0"
              onClick={() => setTabletExpanded(false)}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {sidebarCollapsed && (
            <button
              className="lg:hidden absolute right-0 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/70 transition-colors"
              onClick={() => setTabletExpanded(true)}
            >
              <Menu className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 scrollbar-none">
          {SIDEBAR_ITEMS.map((item) => (
            <SidebarNavItem
              key={item.href}
              item={item}
              location={relPath}
              collapsed={sidebarCollapsed}
              onClick={() => setTabletExpanded(false)}
              t={t}
            />
          ))}

          {/* Divider */}
          <div className={cn("my-2", sidebarCollapsed ? "mx-3 border-t border-white/65" : "mx-2 border-t border-white/65")} />

          {SIDEBAR_BOTTOM.map((item) => (
            <SidebarNavItem
              key={item.href}
              item={item}
              location={relPath}
              collapsed={sidebarCollapsed}
              onClick={() => setTabletExpanded(false)}
              t={t}
            />
          ))}
        </nav>

        {/* Collapse toggle (desktop only) */}
        <div className="hidden lg:block border-t border-white/65 px-2 py-2 flex-shrink-0">
          <button
            onClick={toggleDesktopCollapse}
            className={cn(
              "w-full flex items-center rounded-lg p-2 transition-colors",
              "text-slate-500 hover:text-slate-900 hover:bg-white/70",
              desktopCollapsed ? "justify-center" : "gap-2.5 px-3",
            )}
            title={desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {desktopCollapsed
              ? <PanelLeftOpen className="h-4 w-4" />
              : <><PanelLeftClose className="h-4 w-4 flex-shrink-0" /><span className="text-xs font-semibold">{t("nav_collapse")}</span></>
            }
          </button>
        </div>

        {/* User card */}
        {user && (
          <div className="border-t border-white/65 px-2 py-2 flex-shrink-0">
            <div className={cn(
              "flex items-center rounded-xl bg-white/62 border border-white/75 shadow-[0_14px_34px_rgba(56,119,182,.10)] transition-colors",
              sidebarCollapsed ? "p-1.5 justify-center" : "gap-2.5 p-2.5",
            )}>
              <Avatar className="h-8 w-8 border border-sky-200 flex-shrink-0">
                <AvatarImage src={user.imageUrl} />
                <AvatarFallback className="text-xs bg-sky-100 text-sky-700 font-bold">
                  {user.firstName?.charAt(0) ?? "U"}
                </AvatarFallback>
              </Avatar>
              {!sidebarCollapsed && (
                <>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-[13px] font-semibold text-slate-900 truncate leading-none">{user.fullName || "Creator"}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{user.primaryEmailAddress?.emailAddress}</p>
                  </div>
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50 flex-shrink-0"
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
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/70 bg-white/72 backdrop-blur-2xl sticky top-0 z-30 shadow-[0_12px_38px_rgba(56,119,182,.10)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-white via-sky-100 to-amber-100 flex items-center justify-center border border-white/80 flex-shrink-0">
              <img src={`${basePath}/logo.svg`} alt="LiveStorm AI" className="h-5 w-5" />
            </div>
            <span className="font-black text-[14px] text-slate-950 tracking-tight">
              LiveStorm <span className="text-sky-500">AI</span>
            </span>
          </div>
          <button
            onClick={() => setMoreOpen(true)}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-950 hover:bg-white/70 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        {/* Desktop top bar */}
        <header className="hidden md:flex items-center justify-between px-6 py-3 border-b border-white/70 bg-white/54 backdrop-blur-2xl sticky top-0 z-20 shadow-[0_12px_40px_rgba(56,119,182,.08)]">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-500">Storm Companion Composer</p>
            <h1 className="text-sm font-black text-slate-950 tracking-wide">{currentLabel}</h1>
          </div>
          <div className="hidden lg:flex items-center gap-1 text-[10px] text-slate-300 font-mono">
            <kbd className="border border-sky-100 bg-white/60 rounded px-1 py-0.5">⌘1</kbd>
            <span>–</span>
            <kbd className="border border-sky-100 bg-white/60 rounded px-1 py-0.5">⌘5</kbd>
            <span className="font-sans ml-0.5 text-slate-300">navigate</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 pb-24 md:pb-6">
          <LiveSessionProvider>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={relPath}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </LiveSessionProvider>
        </main>
      </div>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/82 backdrop-blur-2xl border-t border-white/75 shadow-[0_-16px_44px_rgba(56,119,182,.10)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex h-16">
          {[SIDEBAR_ITEMS[0], SIDEBAR_ITEMS[5], SIDEBAR_ITEMS[1]].map((item) => {
            const active = isNavActive(item.href, relPath);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="flex-1">
                <div className={cn(
                  "flex flex-col items-center justify-center gap-1 h-full w-full relative transition-all active:opacity-60",
                  active ? "text-sky-600" : "text-slate-500",
                )}>
                  {active && (
                    <span className="absolute top-0 inset-x-0 flex justify-center">
                      <span className="w-8 h-0.5 rounded-full bg-amber-400 block" />
                    </span>
                  )}
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-semibold leading-none">{t(item.labelKey as any)}</span>
                </div>
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-1 h-full text-slate-500 active:opacity-60 transition-opacity"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-xs font-semibold leading-none">{t("nav_more")}</span>
          </button>
        </div>
      </nav>

      {/* ── MOBILE SHEET ── */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-slate-900/22 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
          <div className="relative w-full bg-white/88 backdrop-blur-2xl rounded-t-3xl border-t border-white/80 shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-200" />
            </div>
            <div className="px-4 pb-8">
              <div className="flex items-center justify-between py-3 mb-3 border-b border-white/70">
                <h3 className="text-sm font-bold text-slate-950">{t("nav_navigation")}</h3>
                <button onClick={() => setMoreOpen(false)} className="p-2 rounded-lg text-slate-500 hover:bg-white/70">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {ALL_NAV.map((item) => {
                  const active = isNavActive(item.href, relPath);
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href}
                      onClick={() => { setLocation(item.href); setMoreOpen(false); }}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-xl border min-h-[80px] justify-center transition-all active:scale-95",
                        active
                          ? "bg-sky-50 border-sky-200 text-slate-950"
                          : "bg-white/62 border-white/75 text-slate-600",
                      )}
                    >
                      <Icon className={cn("h-5 w-5", active && "text-sky-500")} />
                      <span className="text-xs font-semibold text-center leading-tight">{t(item.labelKey as any)}</span>
                    </button>
                  );
                })}
              </div>
              {user && (
                <div className="border-t border-white/70 pt-4">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/70 border border-white/80">
                    <Avatar className="h-10 w-10 border border-sky-200 flex-shrink-0">
                      <AvatarImage src={user.imageUrl} />
                      <AvatarFallback className="text-sm bg-sky-100 text-sky-700 font-bold">
                        {user.firstName?.charAt(0) ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-950 truncate">{user.fullName || "Creator"}</p>
                      <p className="text-xs text-slate-500 truncate">{user.primaryEmailAddress?.emailAddress}</p>
                    </div>
                    <Button
                      variant="ghost" size="icon"
                      className="h-10 w-10 text-slate-400 hover:text-red-500 hover:bg-red-50 flex-shrink-0"
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
