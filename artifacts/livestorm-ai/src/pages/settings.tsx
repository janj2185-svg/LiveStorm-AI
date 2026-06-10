import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useGetMyProfile, useUpdateMyProfile, useConnectTiktok, getGetMyProfileQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { User, Shield, CreditCard, Crown, Zap, Sparkles, Globe, Check, Settings as SettingsIcon, KeyRound, Monitor, Copy, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { LANGUAGES, type Language } from "@/lib/i18n";
import { PageHero, GradientText } from "@/components/ui/premium";
import { useAuth } from "@clerk/react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch(path: string, options?: RequestInit, token?: string) {
  const resp = await fetch(`${BASE}/api${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error ?? `API error ${resp.status}`);
  }
  return resp.json();
}

const profileSchema = z.object({
  displayName: z.string().min(2, "Display name must be at least 2 characters").max(30),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const PLAN_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; desc: string }> = {
  free:    { label: "Free",    icon: Zap,      color: "text-slate-400", desc: "Basic streaming and gamification features." },
  pro:     { label: "Pro",     icon: Sparkles, color: "text-purple-400", desc: "AI Voice, full XP, achievements, fan profiles." },
  creator: { label: "Creator", icon: Crown,    color: "text-amber-400", desc: "AI Translator, analytics, multiple TikTok accounts." },
  studio:  { label: "Studio",  icon: Crown,    color: "text-pink-400",  desc: "3D AI Host, voice clone, team accounts, API access." },
  owner:   { label: "Owner",   icon: KeyRound, color: "text-amber-300", desc: "Permanent lifetime access to all current and future features." },
};

const AI_REPLY_LANGUAGES = [
  { value: "auto",  label: "Auto-detect",     flag: "🌍" },
  { value: "en",    label: "English",         flag: "🇬🇧" },
  { value: "uk",    label: "Українська",      flag: "🇺🇦" },
  { value: "pl",    label: "Polski",          flag: "🇵🇱" },
  { value: "de",    label: "Deutsch",         flag: "🇩🇪" },
  { value: "fr",    label: "Français",        flag: "🇫🇷" },
  { value: "es",    label: "Español",         flag: "🇪🇸" },
  { value: "it",    label: "Italiano",        flag: "🇮🇹" },
  { value: "pt",    label: "Português",       flag: "🇧🇷" },
  { value: "nl",    label: "Nederlands",      flag: "🇳🇱" },
  { value: "tr",    label: "Türkçe",          flag: "🇹🇷" },
  { value: "ru",    label: "Русский",         flag: "🇷🇺" },
  { value: "ar",    label: "العربية",         flag: "🇸🇦" },
  { value: "hi",    label: "हिन्दी",          flag: "🇮🇳" },
  { value: "ja",    label: "日本語",          flag: "🇯🇵" },
  { value: "ko",    label: "한국어",          flag: "🇰🇷" },
  { value: "zh",    label: "简体中文",        flag: "🇨🇳" },
  { value: "zh-TW", label: "繁體中文",        flag: "🇹🇼" },
  { value: "id",    label: "Bahasa Indonesia", flag: "🇮🇩" },
  { value: "vi",    label: "Tiếng Việt",      flag: "🇻🇳" },
  { value: "th",    label: "ภาษาไทย",        flag: "🇹🇭" },
];

type SettingsTab = "profile" | "billing" | "language" | "obs";

interface ObsOverlay {
  key: string;
  name: string;
  description: string;
  width: number;
  height: number;
  url: string;
}

const OVERLAY_ICONS: Record<string, string> = {
  alerts: "🔔",
  goals: "🎯",
  "boss-battle": "⚔️",
  leaderboard: "🏆",
  "activity-feed": "📜",
};

function ObsTab({ authToken }: { authToken: string | null }) {
  const { toast } = useToast();
  const [overlays, setOverlays] = useState<ObsOverlay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadUrls = useCallback(async () => {
    if (!authToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/obs/urls", undefined, authToken);
      setOverlays(data.overlays ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    loadUrls();
  }, [loadUrls]);

  const handleCopy = async (url: string, key: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      toast({ title: "Copy failed", description: "Please copy the URL manually.", variant: "destructive" });
    }
  };

  const handleRegenerate = async () => {
    if (!authToken) return;
    setRegenerating(true);
    try {
      await apiFetch("/obs/token", { method: "POST" }, authToken);
      await loadUrls();
      setConfirmRegen(false);
      toast({ title: "Token regenerated", description: "All overlay URLs have been updated. Update your OBS browser sources." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-white/[0.04] animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-white/[0.04] border border-white/8 p-6 text-center space-y-3">
        <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" onClick={loadUrls} className="border-white/10">
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Setup guide */}
      <div className="rounded-2xl bg-blue-500/5 border border-blue-500/20 p-5 space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <Monitor className="h-4 w-4 text-blue-400" />
          <p className="text-sm font-semibold text-blue-300">How to add overlays to OBS</p>
        </div>
        <ol className="space-y-1.5 text-sm text-muted-foreground list-decimal list-inside">
          <li>In OBS Studio, click <span className="text-foreground font-medium">+</span> in the Sources panel and choose <span className="text-foreground font-medium">Browser</span></li>
          <li>Paste the URL below into the URL field and set the width &amp; height shown</li>
          <li>Check <span className="text-foreground font-medium">Shutdown source when not visible</span> for best performance</li>
          <li>Position the browser source over your stream scene</li>
        </ol>
      </div>

      {/* Overlay list */}
      <div className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/8 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/15">
            <Monitor className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">Browser Source URLs</p>
            <p className="text-xs text-muted-foreground">Copy any URL into OBS as a Browser Source</p>
          </div>
        </div>
        <div className="divide-y divide-white/5">
          {overlays.map((overlay) => (
            <div key={overlay.key} className="px-6 py-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5 select-none">{OVERLAY_ICONS[overlay.key] ?? "📺"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-white text-sm">{overlay.name}</p>
                    <span className="text-xs text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full">
                      {overlay.width} × {overlay.height}px
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{overlay.description}</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-black/30 border border-white/8 rounded-lg px-3 py-2 text-slate-300 truncate font-mono">
                      {overlay.url}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 border-white/10 gap-1.5 h-8 px-3"
                      onClick={() => handleCopy(overlay.url, overlay.key)}
                    >
                      {copiedKey === overlay.key ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                          <span className="text-xs text-green-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span className="text-xs">Copy</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Token management */}
      <div className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/8 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-500/10">
            <KeyRound className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">Security</p>
            <p className="text-xs text-muted-foreground">Regenerate your token if your overlay URLs were leaked</p>
          </div>
        </div>
        <div className="p-6">
          {!confirmRegen ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground max-w-sm">
                Regenerating your token immediately invalidates all existing overlay URLs. You will need to update every Browser Source in OBS with the new URLs.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 shrink-0 ml-4"
                onClick={() => setConfirmRegen(true)}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Regenerate Token
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                <p className="text-sm text-red-300">All current OBS URLs will stop working. Are you sure?</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmRegen(false)}
                  disabled={regenerating}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleRegenerate}
                  disabled={regenerating}
                >
                  {regenerating ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  {regenerating ? "Regenerating…" : "Yes, regenerate"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function Settings() {
  const { data: user, isLoading } = useGetMyProfile();
  const updateProfile = useUpdateMyProfile();
  const connectTiktok = useConnectTiktok();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { language, setLanguage, t } = useLanguage();
  const { getToken } = useAuth();
  const [tab, setTab] = useState<SettingsTab>("profile");
  const [billingLoading, setBillingLoading] = useState<string | null>(null);
  const [aiReplyLang, setAiReplyLang] = useState("auto");
  const [langSaving, setLangSaving] = useState(false);
  const [persona, setPersona] = useState<any>(null);
  const [tiktokEditing, setTiktokEditing] = useState(false);
  const [tiktokInput, setTiktokInput] = useState("");
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    getToken().then((t) => setAuthToken(t)).catch(() => {});
  }, [getToken]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "billing") setTab("billing");
    if (params.get("tab") === "language") setTab("language");
    if (params.get("tab") === "obs") setTab("obs");
    if (params.get("success") === "1") {
      toast({ title: "Subscription activated!", description: "Your plan has been upgraded." });
      queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
    }
  }, []);

  useEffect(() => {
    if (tab === "language") {
      apiFetch("/ai/config", undefined, authToken ?? undefined).then((cfg) => {
        setPersona(cfg);
        setAiReplyLang(cfg.replyLanguage ?? "auto");
      }).catch(() => {});
    }
  }, [tab, authToken]);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName: "" },
  });

  useEffect(() => {
    if (user) form.reset({ displayName: user.displayName || "" });
  }, [user, form]);

  const onSubmit = (data: ProfileFormValues) => {
    updateProfile.mutate(
      { data },
      {
        onSuccess: () => {
          toast({ title: "Profile Updated", description: "Your settings have been saved." });
          queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
        },
        onError: () => toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" }),
      },
    );
  };

  const handleManageBilling = async () => {
    setBillingLoading("portal");
    try {
      const { url } = await apiFetch("/billing/portal", { method: "POST" }, authToken ?? undefined);
      if (url) window.location.href = url;
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setBillingLoading(null);
    }
  };

  const handleSaveLanguage = async () => {
    setLangSaving(true);
    try {
      await Promise.all([
        apiFetch("/users/me", { method: "PATCH", body: JSON.stringify({ uiLanguage: language }) }, authToken ?? undefined),
        persona && apiFetch("/ai/config", { method: "PUT", body: JSON.stringify({ replyLanguage: aiReplyLang }) }, authToken ?? undefined),
      ]);
      toast({ title: t("success"), description: t("lang_saved") });
      queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
    } catch (e: any) {
      toast({ title: t("error"), description: e.message, variant: "destructive" });
    } finally {
      setLangSaving(false);
    }
  };

  const handleSaveTiktok = () => {
    const username = tiktokInput.replace(/^@/, "").trim();
    if (!username) return;
    connectTiktok.mutate(
      { data: { tiktokUsername: username } },
      {
        onSuccess: () => {
          toast({ title: "TikTok account saved", description: `@${username} is now linked.` });
          setTiktokInput("");
          setTiktokEditing(false);
          queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to save TikTok username.", variant: "destructive" });
        },
      },
    );
  };

  const planMeta = PLAN_META[(user?.plan as string) ?? "free"] ?? PLAN_META.free;
  const PlanIcon = planMeta.icon;

  const TABS: { id: SettingsTab; label: string; icon?: React.ReactNode }[] = [
    { id: "profile",  label: t("settings_tab_profile") },
    { id: "language", label: t("settings_tab_language"), icon: <Globe className="h-3.5 w-3.5" /> },
    { id: "billing",  label: t("settings_tab_billing"),  icon: <CreditCard className="h-3.5 w-3.5" /> },
    { id: "obs",      label: "OBS Overlays",             icon: <Monitor className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHero
        gradientFrom="rgba(124,58,237,0.12)"
        gradientTo="rgba(14,165,233,0.06)"
        icon={
          <div className="p-3 rounded-2xl bg-primary/15 border border-primary/20 shadow-lg shadow-primary/10">
            <SettingsIcon className="h-8 w-8 text-primary" />
          </div>
        }
        title={
          <span>
            Account{" "}
            <GradientText from="from-violet-400" to="to-cyan-400">{t("settings_title")}</GradientText>
          </span>
        }
        subtitle={t("settings_desc")}
        right={
          user?.role === "owner" ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40">
              <KeyRound className="h-4 w-4 text-amber-300" />
              <span className="text-xs font-bold text-amber-200">Owner</span>
            </div>
          ) : user?.plan && user.plan !== "free" ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Crown className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-bold text-amber-300 capitalize">{user.plan}</span>
            </div>
          ) : undefined
        }
      />

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/8 w-fit">
        {TABS.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === tb.id
                ? "bg-primary/20 text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            <span className="flex items-center gap-1.5">
              {tb.icon}
              {tb.label}
            </span>
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {tab === "profile" && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/8 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/15">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-white text-sm">{t("profile_title")}</p>
                <p className="text-xs text-muted-foreground">{t("profile_desc")}</p>
              </div>
            </div>
            <div className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("profile_display_name")}</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter display name" {...field} className="bg-background border-border max-w-md" disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-2 max-w-md">
                    <Label htmlFor="email-readonly" className="text-sm font-medium">{t("profile_email")}</Label>
                    <Input id="email-readonly" value={user?.email || ""} disabled className="bg-background/50 border-border opacity-50" />
                    <p className="text-xs text-muted-foreground">{t("profile_email_note")}</p>
                  </div>
                  <Button type="submit" className="mt-4 bg-primary hover:bg-primary/90" disabled={updateProfile.isPending || isLoading}>
                    {updateProfile.isPending ? t("saving") : t("profile_save")}
                  </Button>
                </form>
              </Form>
            </div>
          </div>

          {/* TikTok Account */}
          <div className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/8 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/15">
                <span className="text-primary font-black text-sm">@</span>
              </div>
              <div>
                <p className="font-semibold text-white text-sm">TikTok Account</p>
                <p className="text-xs text-muted-foreground">
                  Link your TikTok username to connect to your LIVE stream.
                </p>
              </div>
            </div>
            <div className="p-6">
              {user?.tiktokUsername && !tiktokEditing ? (
                <div className="flex items-center justify-between p-4 rounded-xl bg-black/20 border border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-primary font-black">@</span>
                    </div>
                    <div>
                      <p className="font-bold text-white">@{user.tiktokUsername}</p>
                      <p className="text-xs text-green-400 font-medium flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                        Account linked
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/10 text-muted-foreground hover:text-foreground"
                    onClick={() => { setTiktokEditing(true); setTiktokInput(user.tiktokUsername ?? ""); }}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 max-w-md">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">@</span>
                      <Input
                        className="pl-7 bg-background border-border"
                        placeholder="yourhandle"
                        value={tiktokInput}
                        onChange={(e) => setTiktokInput(e.target.value.replace(/^@/, ""))}
                        onKeyDown={(e) => e.key === "Enter" && handleSaveTiktok()}
                        autoFocus={tiktokEditing}
                      />
                    </div>
                    <Button
                      onClick={handleSaveTiktok}
                      disabled={connectTiktok.isPending || !tiktokInput.trim()}
                      className="bg-primary hover:bg-primary/90 text-white shrink-0"
                    >
                      {connectTiktok.isPending ? "Saving…" : "Save"}
                    </Button>
                    {tiktokEditing && (
                      <Button
                        variant="ghost"
                        onClick={() => { setTiktokEditing(false); setTiktokInput(""); }}
                        className="shrink-0"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter your TikTok handle without the @. Example: <span className="text-foreground font-medium">yourhandle</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/8 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/15">
                <Shield className="w-4 h-4 text-accent" />
              </div>
              <p className="font-semibold text-white text-sm">{t("security_title")}</p>
            </div>
            <div className="p-6">
              <p className="text-sm text-muted-foreground">
                {t("security_desc")}{" "}
                <a href="/sign-in" className="text-primary hover:underline">{t("security_manage")}</a>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Language Tab */}
      {tab === "language" && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/8 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/15">
                <Globe className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-white text-sm">{t("lang_title")}</p>
                <p className="text-xs text-muted-foreground">{t("lang_desc")}</p>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">{t("lang_select")}</Label>
                <div className="grid grid-cols-2 gap-3 max-w-md">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setLanguage(lang.code as Language)}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                        language === lang.code
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-white/8 hover:border-white/15 hover:bg-white/5 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="text-2xl">{lang.flag}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{lang.nativeName}</p>
                        <p className="text-xs opacity-60 truncate">{lang.name}</p>
                      </div>
                      {language === lang.code && <Check className="h-4 w-4 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-white/8">
                <div>
                  <Label className="text-sm font-medium text-foreground">{t("lang_ai_reply")}</Label>
                  <p className="text-xs text-muted-foreground mt-1">{t("lang_ai_reply_desc")}</p>
                </div>
                <div className="grid grid-cols-1 gap-2 max-w-md">
                  {AI_REPLY_LANGUAGES.map((lang) => (
                    <button
                      key={lang.value}
                      onClick={() => setAiReplyLang(lang.value)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
                        aiReplyLang === lang.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-white/8 hover:border-white/15 hover:bg-white/5 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="text-lg">{lang.flag}</span>
                      <span className="text-sm font-medium">{lang.label}</span>
                      {aiReplyLang === lang.value && <Check className="h-4 w-4 ml-auto flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleSaveLanguage}
                className="bg-primary hover:bg-primary/90"
                disabled={langSaving}
              >
                {langSaving ? t("saving") : t("lang_save")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Billing Tab */}
      {tab === "billing" && (
        <div className="space-y-4">
          {user?.role === "owner" ? (
            <div className="rounded-2xl overflow-hidden border border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-orange-500/5">
              <div className="px-6 py-4 border-b border-amber-500/20 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/15">
                  <KeyRound className="w-4 h-4 text-amber-300" />
                </div>
                <p className="font-semibold text-amber-200 text-sm">Owner Account — Lifetime Access</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-4">
                  <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-300">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-amber-200">Owner</p>
                      <Badge className="text-xs bg-amber-500/20 border-amber-500/40 text-amber-300 border">Permanent</Badge>
                    </div>
                    <p className="text-sm text-amber-300/70">No subscription required · No billing · No plan checks</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-amber-300 font-medium mb-3">Permanent access includes:</p>
                  <p className="text-green-400">✓ All premium features (current & future)</p>
                  <p className="text-green-400">✓ All enterprise features</p>
                  <p className="text-green-400">✓ AI Voice & AI Avatars</p>
                  <p className="text-green-400">✓ Real TikTok mode</p>
                  <p className="text-green-400">✓ Unlimited automations</p>
                  <p className="text-green-400">✓ Advanced Analytics</p>
                  <p className="text-green-400">✓ 3D AI Host & Voice Clone</p>
                  <p className="text-green-400">✓ All future premium features</p>
                  <p className="text-green-400">✓ No usage limits</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/8 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/15">
                    <CreditCard className="w-4 h-4 text-primary" />
                  </div>
                  <p className="font-semibold text-white text-sm">{t("billing_title")}</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="p-4 rounded-xl bg-background/50 border border-white/8 flex items-center gap-4">
                    <div className={`p-2.5 rounded-lg bg-white/5 ${planMeta.color}`}>
                      <PlanIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-white capitalize">{planMeta.label} Plan</p>
                        <Badge variant="outline" className="text-xs border-white/20">Active</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{planMeta.desc}</p>
                    </div>
                    {(user?.plan === "free" || !user?.plan) && (
                      <Button asChild className="bg-primary hover:bg-primary/90 text-white">
                        <Link to="/pricing">{t("billing_upgrade")}</Link>
                      </Button>
                    )}
                  </div>

                  {user?.plan !== "free" && user?.plan && (
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={handleManageBilling}
                        disabled={billingLoading === "portal"}
                        className="border-white/10"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        {billingLoading === "portal" ? t("loading") : t("billing_manage")}
                      </Button>
                      <Button asChild variant="ghost">
                        <Link to="/pricing">{t("billing_compare")}</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/8 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5">
                  <p className="text-sm font-semibold text-white">What's included in your plan</p>
                </div>
                <div className="p-6">
                  <div className="space-y-2 text-sm">
                    {(user?.plan === "free" || !user?.plan) && (
                      <>
                        <p className="text-green-400">✓ Basic AI Co-Host</p>
                        <p className="text-green-400">✓ Basic Boss Battle</p>
                        <p className="text-green-400">✓ Viewer leaderboard</p>
                        <p className="text-muted-foreground line-through">✕ AI Voice (Pro+)</p>
                        <p className="text-muted-foreground line-through">✕ Achievements & Lucky Drops (Pro+)</p>
                        <p className="text-muted-foreground line-through">✕ AI Translator (Creator+)</p>
                      </>
                    )}
                    {user?.plan === "pro" && (
                      <>
                        <p className="text-green-400">✓ AI Voice (OpenAI TTS)</p>
                        <p className="text-green-400">✓ Full XP System & Achievements</p>
                        <p className="text-green-400">✓ Fan Profiles & Leaderboards</p>
                        <p className="text-green-400">✓ 10 automations + OBS Sources</p>
                        <p className="text-muted-foreground line-through">✕ AI Translator (Creator+)</p>
                        <p className="text-muted-foreground line-through">✕ Multiple TikTok accounts (Creator+)</p>
                      </>
                    )}
                    {user?.plan === "creator" && (
                      <>
                        <p className="text-green-400">✓ Everything in Pro</p>
                        <p className="text-green-400">✓ AI Translator (20 languages)</p>
                        <p className="text-green-400">✓ Advanced Analytics</p>
                        <p className="text-green-400">✓ Multiple TikTok accounts</p>
                        <p className="text-green-400">✓ Unlimited automations</p>
                        <p className="text-muted-foreground line-through">✕ 3D AI Host (Studio)</p>
                      </>
                    )}
                    {user?.plan === "studio" && (
                      <>
                        <p className="text-green-400">✓ Everything in Creator</p>
                        <p className="text-green-400">✓ 3D AI Host (Early Access)</p>
                        <p className="text-green-400">✓ Voice Clone</p>
                        <p className="text-green-400">✓ Team Accounts & API Access</p>
                        <p className="text-green-400">✓ Dedicated support</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* OBS Overlays Tab */}
      {tab === "obs" && <ObsTab authToken={authToken} />}
    </div>
  );
}
