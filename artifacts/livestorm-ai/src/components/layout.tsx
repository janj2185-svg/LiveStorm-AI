import { useState, useEffect } from "react";
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
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SIDEBAR_ITEMS: SimpleNavItem[] = [
  { label: "Dashboard",    href: "/dashboard",    icon: LayoutDashboard },
  { label: "Live Studio",  href: "/live-studio",  icon: Monitor },
  { label: "Scenes",       href: "/live-control", icon: Film },
  { label: "Gifts",        href: "/gamification", icon: Gift },
  { label: "Community",    href: "/universe",     icon: Users },
  { label: "AI Storm",     href: "/ai-assistant", icon: Bot },
  { label: "Storm Pass",   href: "/pass",         icon: ShieldCheck },
  { label: "Boss Battle",  href: "/boss-battle",  icon: Swords },
];

const SIDEBAR_BOTTOM: SimpleNavItem[] = [
  { label: "Analytics",  href: "/analytics",  icon: BarChart2 },
  { label: "Settings",   href: "/settings",   icon: SettingsIcon },
];

const ALL_NAV = [...SIDEBAR_ITEMS, ...SIDEBAR_BOTTOM];

function isNavActive(href: string, location: string): boolean {
  if (href === "/dashboard") return location === "/dashboard" || location === "/";
  return location === href || location.startsWith(href + "/");
}

function routeVariant(path: string): BgVariant {
  if (path.startsWith("/ai-assistant") || path.startsWith("/avatar-studio")) return "ai";
  if (path.startsWith("/dashboard") || path === "/" || path === "") return "dashboard";
  if (path.startsWith("/gamification") || path.startsWith("/boss-battle") || path.startsWith("/games")) return "gamification";
  if (path.startsWith("/mini-games")) return "gaming";
  if (path.startsWith("/universe") || path.startsWith("/kingdom")) return "universe";
  if (path.startsWith("/live-studio") || path.startsWith("/overlays") || path.startsWith("/automation") || path.startsWith("/live-control")) return "studio";
  if (path.startsWith("/ai-content")) return "content";
  if (path.startsWith("/moderation")) return "moderation";
  return "default";
}

function SidebarNavItem({
  item, location, collapsed, onClick,
}: {
  item: SimpleNavItem;
  location: string;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const active = isNavActive(item.href, location);
  const Icon = item.icon;
  return (
    <Link href={item.href} className="block" onClick={onClick}>
      <div
        data-testid={`link-${item.href.replace(/\//g, "")}`}
        title={collapsed ? item.label : undefined}
        className={cn(
          "relative flex items-center rounded-xl cursor-pointer transition-all duration-150 min-h-[40px]",
          collapsed ? "px-0 justify-center" : "gap-3 px-3",
          active
            ? "bg-primary/20 border border-primary/28 text-white shadow-sm"
            : "border border-transparent text-white/42 hover:text-white/75 hover:bg-white/[0.07]",
        )}
      >
        <Icon className={cn(
          "flex-shrink-0 transition-colors",
          collapsed ? "h-[18px] w-[18px]" : "h-[16px] w-[16px]",
          active ? "text-primary" : "text-white/38",
        )} />
        {!collapsed && (
          <span className="text-[13px] font-medium whitespace-nowrap flex-1 leading-none">
            {item.label}
          </span>
        )}
        {!collapsed && active && (
          <div className="w-1.5 h-1.5 rounded-full bg-primary/70 flex-shrink-0" />
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
  const currentLabel = currentItem?.label ?? "Dashboard";

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <AnimatedBackground variant={bgVariant} />

      {tabletExpanded && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm hidden md:block lg:hidden"
          onClick={() => setTabletExpanded(false)}
        />
      )}

      {/* ── SIDEBAR ── */}
      <aside
        className={cn(
          "hidden md:flex flex-col fixed inset-y-0 left-0 z-50",
          "border-r border-sidebar-border/60",
          "transition-all duration-300 ease-in-out",
          sidebarW,
        )}
        style={{
          backgroundImage: "url('/sidebar-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >

        {/* Brand */}
        <div className={cn(
          "flex items-center gap-3 border-b border-sidebar-border/50 min-h-[60px] flex-shrink-0 relative",
          sidebarCollapsed ? "justify-center px-3" : "px-4",
        )}>
          <div className={cn(
            "w-9 h-9 rounded-xl bg-gradient-to-br from-primary/40 to-cyan-500/20 flex items-center justify-center",
            "border border-primary/35 shadow-lg shadow-primary/20 flex-shrink-0",
          )}>
            <img src={`${basePath}/logo.svg`} alt="LiveStorm AI" className="h-5 w-5" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="font-black text-[13px] tracking-tight text-white leading-none whitespace-nowrap">
                LiveStorm <span className="text-primary">AI</span>
              </p>
              <p className="text-[8px] text-white/22 mt-0.5 tracking-[0.22em] font-bold whitespace-nowrap uppercase">
                Next Gen Streaming
              </p>
            </div>
          )}

          {/* Tablet collapse button */}
          {!sidebarCollapsed && (
            <button
              className="lg:hidden flex items-center justify-center w-7 h-7 rounded-lg text-white/25 hover:text-white/55 hover:bg-white/[0.07] transition-colors flex-shrink-0"
              onClick={() => setTabletExpanded(false)}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {sidebarCollapsed && (
            <button
              className="lg:hidden absolute right-0 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg text-white/25 hover:text-white/55 hover:bg-white/[0.07] transition-colors"
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
            />
          ))}

          {/* Divider */}
          <div className={cn("my-2", sidebarCollapsed ? "mx-3 border-t border-white/[0.05]" : "mx-2 border-t border-white/[0.06]")} />

          {SIDEBAR_BOTTOM.map((item) => (
            <SidebarNavItem
              key={item.href}
              item={item}
              location={relPath}
              collapsed={sidebarCollapsed}
              onClick={() => setTabletExpanded(false)}
            />
          ))}
        </nav>

        {/* Collapse toggle (desktop only) */}
        <div className="hidden lg:block border-t border-sidebar-border/30 px-2 py-2 flex-shrink-0">
          <button
            onClick={toggleDesktopCollapse}
            className={cn(
              "w-full flex items-center rounded-lg p-2 transition-colors",
              "text-white/22 hover:text-white/50 hover:bg-white/[0.05]",
              desktopCollapsed ? "justify-center" : "gap-2.5 px-3",
            )}
            title={desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {desktopCollapsed
              ? <PanelLeftOpen className="h-4 w-4" />
              : <><PanelLeftClose className="h-4 w-4 flex-shrink-0" /><span className="text-[11px] font-medium">Collapse</span></>
            }
          </button>
        </div>

        {/* User card */}
        {user && (
          <div className="border-t border-sidebar-border/40 px-2 py-2 flex-shrink-0">
            <div className={cn(
              "flex items-center rounded-xl bg-white/[0.04] border border-white/[0.06] transition-colors",
              sidebarCollapsed ? "p-1.5 justify-center" : "gap-2.5 p-2.5",
            )}>
              <Avatar className="h-8 w-8 border border-primary/25 flex-shrink-0">
                <AvatarImage src={user.imageUrl} />
                <AvatarFallback className="text-xs bg-primary/25 text-primary font-bold">
                  {user.firstName?.charAt(0) ?? "U"}
                </AvatarFallback>
              </Avatar>
              {!sidebarCollapsed && (
                <>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-[12px] font-semibold text-white/85 truncate leading-none">{user.fullName || "Creator"}</p>
                    <p className="text-[9px] text-white/28 truncate mt-0.5">{user.primaryEmailAddress?.emailAddress}</p>
                  </div>
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 text-white/22 hover:text-red-400 hover:bg-red-500/10 flex-shrink-0"
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
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-sidebar-border/50 bg-sidebar/90 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/35 to-cyan-500/20 flex items-center justify-center border border-primary/28 flex-shrink-0">
              <img src={`${basePath}/logo.svg`} alt="LiveStorm AI" className="h-5 w-5" />
            </div>
            <span className="font-black text-[14px] text-white tracking-tight">
              LiveStorm <span className="text-primary">AI</span>
            </span>
          </div>
          <button
            onClick={() => setMoreOpen(true)}
            className="p-2 rounded-lg text-white/45 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        {/* Desktop top bar */}
        <header className="hidden md:flex items-center justify-between px-6 py-3 border-b border-white/[0.06] bg-black/15 backdrop-blur-sm sticky top-0 z-20">
          <h1 className="text-[13px] font-semibold text-white/50 tracking-wide">{currentLabel}</h1>
          <div className="hidden lg:flex items-center gap-1 text-[10px] text-white/12 font-mono">
            <kbd className="border border-white/[0.08] rounded px-1 py-0.5">⌘1</kbd>
            <span>–</span>
            <kbd className="border border-white/[0.08] rounded px-1 py-0.5">⌘5</kbd>
            <span className="font-sans ml-0.5 text-white/10">navigate</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 pb-24 md:pb-6">
          <LiveSessionProvider>
            {children}
          </LiveSessionProvider>
        </main>
      </div>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-sidebar/95 backdrop-blur-md border-t border-sidebar-border/50"
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
                  active ? "text-primary" : "text-white/38",
                )}>
                  {active && (
                    <span className="absolute top-0 inset-x-0 flex justify-center">
                      <span className="w-8 h-0.5 rounded-full bg-primary block" />
                    </span>
                  )}
                  <Icon className="h-5 w-5" />
                  <span className="text-[9px] font-medium leading-none">{item.label}</span>
                </div>
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-1 h-full text-white/38 active:opacity-60 transition-opacity"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[9px] font-medium leading-none">More</span>
          </button>
        </div>
      </nav>

      {/* ── MOBILE SHEET ── */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
          <div className="relative w-full bg-sidebar rounded-t-3xl border-t border-sidebar-border shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/15" />
            </div>
            <div className="px-4 pb-8">
              <div className="flex items-center justify-between py-3 mb-3 border-b border-white/[0.06]">
                <h3 className="text-sm font-bold text-white">Navigation</h3>
                <button onClick={() => setMoreOpen(false)} className="p-2 rounded-lg text-white/40 hover:bg-white/[0.06]">
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
                          ? "bg-primary/20 border-primary/30 text-white"
                          : "bg-white/[0.04] border-white/[0.06] text-white/40",
                      )}
                    >
                      <Icon className={cn("h-5 w-5", active && "text-primary")} />
                      <span className="text-[10px] font-medium text-center leading-tight">{item.label}</span>
                    </button>
                  );
                })}
              </div>
              {user && (
                <div className="border-t border-white/[0.06] pt-4">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                    <Avatar className="h-10 w-10 border border-primary/20 flex-shrink-0">
                      <AvatarImage src={user.imageUrl} />
                      <AvatarFallback className="text-sm bg-primary/25 text-primary font-bold">
                        {user.firstName?.charAt(0) ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{user.fullName || "Creator"}</p>
                      <p className="text-xs text-white/35 truncate">{user.primaryEmailAddress?.emailAddress}</p>
                    </div>
                    <Button
                      variant="ghost" size="icon"
                      className="h-10 w-10 text-white/35 hover:text-red-400 hover:bg-red-500/10 flex-shrink-0"
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
