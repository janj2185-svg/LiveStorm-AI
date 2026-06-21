import { useEffect, useRef, useState } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useAuth } from '@clerk/react';
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/LanguageContext";

import { Layout } from "@/components/layout";
import { Home } from "@/pages/home";
import { Dashboard } from "@/pages/dashboard";
import { LiveStudio } from "@/pages/live-studio";
import { LiveControl } from "@/pages/live-control";
import { LiveControlDiagnostics } from "@/pages/live-control-diagnostics";
import { AvatarStudio } from "@/pages/avatar-studio";
import { Games } from "@/pages/games";
import { Gamification } from "@/pages/gamification";
import { Automation } from "@/pages/automation";
import { Kingdom } from "@/pages/kingdom";
import { BossBattle } from "@/pages/boss-battle";
import { MiniGames } from "@/pages/mini-games";
import { Universe } from "@/pages/universe";
import { Overlays } from "@/pages/overlays";
import { AiAssistant } from "@/pages/ai-assistant";
import { AiContent } from "@/pages/ai-content";
import { Settings } from "@/pages/settings";
import { Pricing } from "@/pages/pricing";
import { Admin } from "@/pages/admin";
import { Analytics } from "@/pages/analytics";
import { Platforms } from "@/pages/platforms";
import { Profile } from "@/pages/profile";
import { Moderation } from "@/pages/moderation";
import { ObsAlerts } from "@/pages/obs/alerts";
import { ObsGoals } from "@/pages/obs/goals";
import { ObsLeaderboard } from "@/pages/obs/leaderboard";
import { ObsBossBattle } from "@/pages/obs/boss-battle";
import { ObsActivityFeed } from "@/pages/obs/activity-feed";
import { StormPass } from "@/pages/storm-pass";
import { PassEntry } from "@/pages/pass-entry";
import { ObsStormPassQR } from "@/pages/obs/storm-pass-qr";

const queryClient = new QueryClient();

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}

if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY');

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#0ea5e9",
    colorForeground: "#0f172a",
    colorMutedForeground: "#64748b",
    colorDanger: "#ef4444",
    colorBackground: "#ffffff",
    colorInput: "#f8fafc",
    colorInputForeground: "#0f172a",
    colorNeutral: "#bae6fd",
    fontFamily: "Space Grotesk, sans-serif",
    borderRadius: "1rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white/80 backdrop-blur-2xl border border-white/80 rounded-2xl w-[440px] max-w-full overflow-hidden shadow-[0_24px_90px_rgba(56,119,182,.16)]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-slate-950 font-bold",
    headerSubtitle: "text-slate-500",
    socialButtonsBlockButtonText: "text-slate-800",
    formFieldLabel: "text-slate-700",
    footerActionLink: "text-sky-600",
    footerActionText: "text-slate-500",
    dividerText: "text-slate-400",
    identityPreviewEditButton: "text-sky-600",
    formFieldSuccessText: "text-emerald-600",
    alertText: "text-red-600",
    logoBox: "p-2",
    logoImage: "h-8 w-auto",
    socialButtonsBlockButton: "border-sky-100 bg-white/70 hover:bg-sky-50",
    formButtonPrimary: "bg-sky-500 hover:bg-sky-600",
    formFieldInput: "bg-white/80 border-sky-100 text-slate-950",
    footerAction: "bg-transparent",
    dividerLine: "bg-sky-100",
    alert: "bg-red-50 border-red-200",
    otpCodeFieldInput: "bg-white/80 border-sky-100 text-slate-950",
    formFieldRow: "gap-2",
    main: "gap-4",
  },
};

function ObsRoutes() {
  return (
    <Switch>
      <Route path="/obs/alerts" component={ObsAlerts} />
      <Route path="/obs/goals" component={ObsGoals} />
      <Route path="/obs/leaderboard" component={ObsLeaderboard} />
      <Route path="/obs/boss-battle" component={ObsBossBattle} />
      <Route path="/obs/activity-feed" component={ObsActivityFeed} />
      <Route path="/obs/storm-pass-qr" component={ObsStormPassQR} />
      <Route>
        <div style={{ padding: "32px", color: "#fff", fontFamily: "sans-serif" }}>
          <h1>OBS Overlay Not Found</h1>
          <p>Available overlays: /obs/alerts, /obs/goals, /obs/leaderboard, /obs/boss-battle, /obs/activity-feed</p>
        </div>
      </Route>
    </Switch>
  );
}

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <Home />
      </Show>
    </>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const [, setLocation] = useLocation();
  const isDevMode = import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get("_devMode") === "1";
  const [devAuthReady, setDevAuthReady] = useState(false);

  useEffect(() => {
    if (!isDevMode) return;
    fetch("/api/dev/login", { credentials: "include" })
      .finally(() => setDevAuthReady(true));
  }, [isDevMode]);

  useEffect(() => {
    if (!isDevMode && isLoaded && !isSignedIn) {
      setLocation(`/sign-in`);
    }
  }, [isLoaded, isSignedIn, setLocation, isDevMode]);

  if (isDevMode && !devAuthReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  if (isDevMode) return <>{children}</>;

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isSignedIn) return null;

  return <>{children}</>;
}

function ApiClientAuthSync() {
  const { getToken } = useAuth();
  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => { setAuthTokenGetter(null); };
  }, [getToken]);
  return null;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/dashboard">
        <ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>
      </Route>
      <Route path="/live-studio">
        <ProtectedRoute><Layout><LiveStudio /></Layout></ProtectedRoute>
      </Route>
      <Route path="/live-control/diagnostics">
        <ProtectedRoute><Layout><LiveControlDiagnostics /></Layout></ProtectedRoute>
      </Route>
      <Route path="/live-control">
        <ProtectedRoute><Layout><LiveControl /></Layout></ProtectedRoute>
      </Route>
      <Route path="/avatar-studio">
        <ProtectedRoute><Layout><AvatarStudio /></Layout></ProtectedRoute>
      </Route>
      <Route path="/games">
        <ProtectedRoute><Layout><Games /></Layout></ProtectedRoute>
      </Route>
      <Route path="/gamification">
        <ProtectedRoute><Layout><Gamification /></Layout></ProtectedRoute>
      </Route>
      <Route path="/automation">
        <ProtectedRoute><Layout><Automation /></Layout></ProtectedRoute>
      </Route>
      <Route path="/kingdom">
        <ProtectedRoute><Layout><Kingdom /></Layout></ProtectedRoute>
      </Route>
      <Route path="/boss-battle">
        <ProtectedRoute><Layout><BossBattle /></Layout></ProtectedRoute>
      </Route>
      <Route path="/mini-games">
        <ProtectedRoute><Layout><MiniGames /></Layout></ProtectedRoute>
      </Route>
      <Route path="/universe">
        <ProtectedRoute><Layout><Universe /></Layout></ProtectedRoute>
      </Route>
      <Route path="/overlays">
        <ProtectedRoute><Layout><Overlays /></Layout></ProtectedRoute>
      </Route>
      <Route path="/ai-assistant">
        <ProtectedRoute><Layout><AiAssistant /></Layout></ProtectedRoute>
      </Route>
      <Route path="/ai-content">
        <ProtectedRoute><Layout><AiContent /></Layout></ProtectedRoute>
      </Route>
      <Route path="/moderation">
        <ProtectedRoute><Layout><Moderation /></Layout></ProtectedRoute>
      </Route>
      <Route path="/analytics">
        <ProtectedRoute><Layout><Analytics /></Layout></ProtectedRoute>
      </Route>
      <Route path="/platforms">
        <ProtectedRoute><Layout><Platforms /></Layout></ProtectedRoute>
      </Route>
      <Route path="/profile">
        <ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>
      </Route>
      <Route path="/pricing">
        <Pricing />
      </Route>
      <Route path="/admin">
        <ProtectedRoute><Layout><Admin /></Layout></ProtectedRoute>
      </Route>

      <Route path="/pass/:slug/:viewer">
        <StormPass />
      </Route>

      <Route path="/pass/:slug">
        <PassEntry />
      </Route>

      <Route path="/pass">
        <PassEntry />
      </Route>

      <Route>
        <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">404 - Not Found</h1>
            <p className="text-muted-foreground">The page you are looking for does not exist.</p>
          </div>
        </div>
      </Route>
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ApiClientAuthSync />
        <ClerkQueryClientCacheInvalidator />
        <AppRoutes />
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function isObsPath(): boolean {
  const path = window.location.pathname;
  const rel = basePath && path.startsWith(basePath) ? path.slice(basePath.length) : path;
  return rel.startsWith("/obs/") || rel === "/obs";
}

function App() {
  if (isObsPath()) {
    return (
      <TooltipProvider>
        <WouterRouter base={basePath}>
          <QueryClientProvider client={queryClient}>
            <ObsRoutes />
          </QueryClientProvider>
        </WouterRouter>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <WouterRouter base={basePath}>
        <LanguageProvider>
          <ClerkProviderWithRoutes />
        </LanguageProvider>
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
