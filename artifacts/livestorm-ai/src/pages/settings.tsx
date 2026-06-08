import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useGetMyProfile, useUpdateMyProfile, getGetMyProfileQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { User, Shield, CreditCard, Crown, Zap, Sparkles, Globe, Check } from "lucide-react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { LANGUAGES, type Language } from "@/lib/i18n";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch(path: string, options?: RequestInit) {
  const resp = await fetch(`${BASE}/api${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
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

const PLAN_META: Record<string, { label: string; icon: any; color: string; desc: string }> = {
  free: { label: "Free", icon: Zap, color: "text-slate-400", desc: "Basic streaming and gamification features." },
  pro: { label: "Pro", icon: Sparkles, color: "text-purple-400", desc: "AI Co-host, 10 automations, analytics." },
  premium: { label: "Premium", icon: Crown, color: "text-amber-400", desc: "Unlimited automations and all features." },
};

const AI_REPLY_LANGUAGES = [
  { value: "auto", label: "Auto-detect", flag: "🌍" },
  { value: "en", label: "English", flag: "🇬🇧" },
  { value: "uk", label: "Українська", flag: "🇺🇦" },
  { value: "pl", label: "Polski", flag: "🇵🇱" },
  { value: "de", label: "Deutsch", flag: "🇩🇪" },
];

type SettingsTab = "profile" | "billing" | "language";

export function Settings() {
  const { data: user, isLoading } = useGetMyProfile();
  const updateProfile = useUpdateMyProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { language, setLanguage, t } = useLanguage();
  const [tab, setTab] = useState<SettingsTab>("profile");
  const [billingLoading, setBillingLoading] = useState<string | null>(null);
  const [aiReplyLang, setAiReplyLang] = useState("auto");
  const [langSaving, setLangSaving] = useState(false);
  const [persona, setPersona] = useState<any>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "billing") setTab("billing");
    if (params.get("tab") === "language") setTab("language");
    if (params.get("success") === "1") {
      toast({ title: "Subscription activated!", description: "Your plan has been upgraded." });
      queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
    }
  }, []);

  useEffect(() => {
    if (tab === "language") {
      apiFetch("/ai/config").then((cfg) => {
        setPersona(cfg);
        setAiReplyLang(cfg.replyLanguage ?? "auto");
      }).catch(() => {});
    }
  }, [tab]);

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
      const { url } = await apiFetch("/billing/portal", { method: "POST" });
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
        apiFetch("/users/me", { method: "PATCH", body: JSON.stringify({ uiLanguage: language }) }),
        persona && apiFetch("/ai/config", { method: "PUT", body: JSON.stringify({ replyLanguage: aiReplyLang }) }),
      ]);
      toast({ title: t("success"), description: t("lang_saved") });
      queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
    } catch (e: any) {
      toast({ title: t("error"), description: e.message, variant: "destructive" });
    } finally {
      setLangSaving(false);
    }
  };

  const planMeta = PLAN_META[(user?.plan as string) ?? "free"] ?? PLAN_META.free;
  const PlanIcon = planMeta.icon;

  const TABS: { id: SettingsTab; label: string; icon?: React.ReactNode }[] = [
    { id: "profile", label: t("settings_tab_profile") },
    { id: "language", label: t("settings_tab_language"), icon: <Globe className="h-3.5 w-3.5" /> },
    { id: "billing", label: t("settings_tab_billing"), icon: <CreditCard className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">{t("settings_title")}</h2>
        <p className="text-muted-foreground">{t("settings_desc")}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border/50">
        {TABS.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === tb.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
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
        <>
          <Card className="bg-card border-white/5">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                {t("profile_title")}
              </CardTitle>
              <CardDescription>{t("profile_desc")}</CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          <Card className="bg-card border-white/5">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Shield className="w-5 h-5 text-accent" />
                {t("security_title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {t("security_desc")}{" "}
                <a href="/sign-in" className="text-primary hover:underline">{t("security_manage")}</a>
              </p>
            </CardContent>
          </Card>
        </>
      )}

      {/* Language Tab */}
      {tab === "language" && (
        <div className="space-y-4">
          {/* Interface Language */}
          <Card className="bg-card border-white/5">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                {t("lang_title")}
              </CardTitle>
              <CardDescription>{t("lang_desc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">{t("lang_select")}</Label>
                <div className="grid grid-cols-2 gap-3 max-w-md">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setLanguage(lang.code as Language)}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                        language === lang.code
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-border/80 hover:bg-white/5 text-muted-foreground hover:text-foreground"
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

              {/* AI Reply Language */}
              <div className="space-y-3 pt-2 border-t border-border/30">
                <div>
                  <Label className="text-sm font-medium text-foreground">{t("lang_ai_reply")}</Label>
                  <p className="text-xs text-muted-foreground mt-1">{t("lang_ai_reply_desc")}</p>
                </div>
                <div className="grid grid-cols-1 gap-2 max-w-md">
                  {AI_REPLY_LANGUAGES.map((lang) => (
                    <button
                      key={lang.value}
                      onClick={() => setAiReplyLang(lang.value)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-left ${
                        aiReplyLang === lang.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-border/80 hover:bg-white/5 text-muted-foreground hover:text-foreground"
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
            </CardContent>
          </Card>
        </div>
      )}

      {/* Billing Tab */}
      {tab === "billing" && (
        <div className="space-y-4">
          <Card className="bg-card border-white/5">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                {t("billing_title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-background border border-border flex items-center gap-4">
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
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    {billingLoading === "portal" ? t("loading") : t("billing_manage")}
                  </Button>
                  <Button asChild variant="ghost">
                    <Link to="/pricing">{t("billing_compare")}</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-white/5">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground font-medium">What's included in your plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {(user?.plan === "free" || !user?.plan) && (
                  <>
                    <p className="text-green-400">✓ Basic live dashboard</p>
                    <p className="text-green-400">✓ 1 automation trigger</p>
                    <p className="text-green-400">✓ Viewer leaderboard</p>
                    <p className="text-muted-foreground line-through">✕ AI Co-host & quests (Pro+)</p>
                    <p className="text-muted-foreground line-through">✕ Unlimited automations (Premium)</p>
                  </>
                )}
                {user?.plan === "pro" && (
                  <>
                    <p className="text-green-400">✓ Everything in Free</p>
                    <p className="text-green-400">✓ AI Co-host & quests</p>
                    <p className="text-green-400">✓ 10 automation triggers</p>
                    <p className="text-green-400">✓ OBS Browser Sources</p>
                    <p className="text-muted-foreground line-through">✕ Unlimited automations (Premium)</p>
                  </>
                )}
                {user?.plan === "premium" && (
                  <>
                    <p className="text-green-400">✓ Everything in Pro</p>
                    <p className="text-green-400">✓ Unlimited automations</p>
                    <p className="text-green-400">✓ Priority support</p>
                    <p className="text-green-400">✓ Early access to new features</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
