import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetAutomations,
  useCreateAutomation,
  useUpdateAutomation,
  useDeleteAutomation,
  useGetAutomationLogs,
  getGetAutomationsQueryKey,
  getGetAutomationLogsQueryKey,
} from "@workspace/api-client-react";
import { useLiveSessionContext } from "@/contexts/LiveSessionContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap, Trash2, Plus, Settings2, ShieldAlert, Activity, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";

const EVENT_TYPES = ["gift", "comment", "like", "follow", "share", "viewerCount"];
const ACTION_TYPES = [
  { value: "ai_response",    label: "AI Response",    description: "AI generates an announcement" },
  { value: "tts",            label: "TTS Announcement", description: "Speak text via AI voice" },
  { value: "custom_message", label: "Custom Message", description: "Broadcast text to the feed" },
  { value: "webhook",        label: "Webhook",         description: "Call an external URL (coming soon)" },
];
const NUMERIC_OPERATORS = [
  { value: "gte", label: ">= (Greater than or equal)" },
  { value: "gt",  label: "> (Greater than)" },
  { value: "lte", label: "<= (Less than or equal)" },
  { value: "eq",  label: "= (Equal)" },
];
const COMMENT_OPERATORS = [
  { value: "any",        label: "Any comment (always fires)" },
  { value: "contains",   label: "Contains keyword" },
  { value: "exact",      label: "Exact match" },
  { value: "startsWith", label: "Starts with" },
  { value: "endsWith",   label: "Ends with" },
  { value: "regex",      label: "Regex pattern" },
];

export function Automation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: automations, isLoading } = useGetAutomations();
  const createAutomation = useCreateAutomation();
  const updateAutomation = useUpdateAutomation();
  const deleteAutomation = useDeleteAutomation();

  const { automationsFired, connected, isActive } = useLiveSessionContext();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: automationLogs, isLoading: logsLoading } = useGetAutomationLogs({
    query: { queryKey: getGetAutomationLogsQueryKey(), refetchInterval: 10000 },
  });

  const [formData, setFormData] = useState({
    name: "",
    eventType: "gift",
    conditionOperator: "gte",
    conditionValue: "100",
    actionType: "ai_response",
    actionPayload: "",
  });

  const handleEventTypeChange = (v: string) => {
    const isComment = v === "comment";
    setFormData({
      ...formData,
      eventType: v,
      conditionOperator: isComment ? "any" : "gte",
      conditionValue: isComment ? "" : "100",
    });
  };

  const needsNumericCondition = ["gift", "like", "viewerCount"].includes(formData.eventType);
  const isCommentEvent = formData.eventType === "comment";
  const needsCondition = needsNumericCondition || isCommentEvent;

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    const includesCondition = needsNumericCondition || (isCommentEvent && formData.conditionOperator !== "any");
    const payload = {
      name: formData.name,
      eventType: formData.eventType,
      actionType: formData.actionType,
      actionPayload: formData.actionPayload,
      conditionOperator: isCommentEvent ? formData.conditionOperator : (needsNumericCondition ? formData.conditionOperator : "any"),
      conditionValue: includesCondition ? formData.conditionValue : "",
    };
    createAutomation.mutate({ data: payload }, {
      onSuccess: () => {
        toast({ title: "Automation created" });
        setIsDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: getGetAutomationsQueryKey() });
        setFormData({ name: "", eventType: "gift", conditionOperator: "gte", conditionValue: "100", actionType: "ai_response", actionPayload: "" });
        queryClient.invalidateQueries({ queryKey: getGetAutomationLogsQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Failed to create", description: String(err), variant: "destructive" });
      }
    });
  };

  const handleToggle = (id: number, isEnabled: boolean) => {
    updateAutomation.mutate({ id, data: { isEnabled } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetAutomationsQueryKey() }); }
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Are you sure you want to delete this trigger?")) return;
    deleteAutomation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Automation deleted" });
        queryClient.invalidateQueries({ queryKey: getGetAutomationsQueryKey() });
      }
    });
  };

  const recentlyFiredIds = new Set(automationsFired.slice(0, 5).map(e => e.automationId));

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-400/50 mb-1">EVENT AUTOMATION</p>
          <h1 className="text-3xl font-black text-white tracking-tight">Automation</h1>
          <p className="text-white/70 text-sm mt-1">Build rules to react to live events automatically.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-primary hover:bg-primary/90 text-white font-bold shrink-0">
              <Plus className="h-4 w-4" />
              New Trigger
            </Button>
          </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-card border-white/10 text-white">
              <DialogHeader>
                <DialogTitle>Create Automation Trigger</DialogTitle>
                <DialogDescription>Set a trigger event and configure the automated action.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Trigger Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. VIP Gift Alert"
                    className="bg-background border-white/10"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>When this event happens:</Label>
                  <Select value={formData.eventType} onValueChange={handleEventTypeChange}>
                    <SelectTrigger className="bg-background border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map(t => (
                        <SelectItem key={t} value={t} className="capitalize">{t.replace("Count", " Count")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isCommentEvent && (
                  <div className="grid gap-4 bg-background/50 p-3 rounded-lg border border-white/5">
                    <div className="grid gap-2">
                      <Label>Comment Condition</Label>
                      <Select
                        value={formData.conditionOperator}
                        onValueChange={v => setFormData({ ...formData, conditionOperator: v, conditionValue: v === "any" ? "" : formData.conditionValue })}
                      >
                        <SelectTrigger className="bg-background border-white/10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COMMENT_OPERATORS.map(o => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {formData.conditionOperator !== "any" && (
                      <div className="grid gap-2">
                        <Label>Keyword / Pattern</Label>
                        <Input
                          type="text"
                          value={formData.conditionValue}
                          onChange={e => setFormData({ ...formData, conditionValue: e.target.value })}
                          placeholder={formData.conditionOperator === "regex" ? "e.g. ^hello|^hi" : "e.g. hello world"}
                          className="bg-background border-white/10"
                        />
                      </div>
                    )}
                  </div>
                )}

                {needsNumericCondition && (
                  <div className="grid grid-cols-2 gap-4 bg-background/50 p-3 rounded-lg border border-white/5">
                    <div className="grid gap-2">
                      <Label>Condition</Label>
                      <Select value={formData.conditionOperator} onValueChange={v => setFormData({...formData, conditionOperator: v})}>
                        <SelectTrigger className="bg-background border-white/10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {NUMERIC_OPERATORS.map(o => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Value</Label>
                      <Input
                        type="number"
                        value={formData.conditionValue}
                        onChange={e => setFormData({...formData, conditionValue: e.target.value})}
                        className="bg-background border-white/10"
                      />
                    </div>
                  </div>
                )}

                <div className="grid gap-2 mt-2">
                  <Label>Do this action:</Label>
                  <Select value={formData.actionType} onValueChange={v => setFormData({...formData, actionType: v})}>
                    <SelectTrigger className="bg-background border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTION_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>
                          <div>
                            <span className="font-medium">{t.label}</span>
                            <span className="ml-2 text-xs text-muted-foreground">{t.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.actionType !== "webhook" && (
                  <div className="grid gap-2">
                    <Label>
                      {formData.actionType === "ai_response" ? "Custom AI prompt context (optional)" :
                       formData.actionType === "tts" ? "Text to speak" :
                       "Message text"}
                    </Label>
                    <Input
                      value={formData.actionPayload}
                      onChange={e => setFormData({...formData, actionPayload: e.target.value})}
                      className="bg-background border-white/10"
                      placeholder={
                        formData.actionType === "ai_response" ? "Leave empty to use event context" :
                        formData.actionType === "tts" ? "e.g. Thanks for the gift!" :
                        "e.g. Welcome to the stream!"
                      }
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-white/10">Cancel</Button>
                <Button onClick={handleCreate} disabled={createAutomation.isPending} className="bg-primary hover:bg-primary/90">
                  {createAutomation.isPending ? "Saving..." : "Save Trigger"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl bg-white/[0.04] border border-white/8" />
            ))
          ) : automations?.length === 0 ? (
            <div className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-dashed border-white/10 p-12 flex flex-col items-center justify-center text-muted-foreground text-center">
              <Settings2 className="h-12 w-12 mb-4 opacity-20" />
              <h3 className="text-lg font-medium text-white mb-2">No Automations Yet</h3>
              <p className="max-w-sm mb-6 text-sm">Create a trigger to automatically respond to gifts, likes, follows, and more during your stream.</p>
              <Button onClick={() => setIsDialogOpen(true)} variant="outline" className="border-primary/50 text-primary hover:bg-primary/10">
                Create First Trigger
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              <AnimatePresence>
                {automations?.map((auto) => (
                  <motion.div
                    key={auto.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <div className={`relative overflow-hidden rounded-2xl transition-all duration-300 border ${
                      recentlyFiredIds.has(auto.id)
                        ? "border-primary shadow-[0_0_20px_rgba(124,58,237,0.3)] bg-primary/5"
                        : "bg-white/[0.04] backdrop-blur-sm border-white/8 hover:border-white/15"
                    }`}>
                      {recentlyFiredIds.has(auto.id) && (
                        <div className="absolute top-3 right-3 flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg animate-pulse">
                          <Zap className="h-3 w-3" /> FIRED
                        </div>
                      )}
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-base font-bold text-white">{auto.name}</h3>
                            <div className="flex gap-2 items-center mt-1.5">
                              <span className="capitalize text-accent font-medium text-xs px-2 py-0.5 bg-accent/10 rounded-lg border border-accent/20">
                                {auto.eventType}
                              </span>
                              {auto.conditionOperator && (
                                <span className="font-mono text-xs text-muted-foreground bg-black/40 px-2 py-0.5 rounded-lg border border-white/5">
                                  {auto.conditionOperator} {auto.conditionValue}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={auto.isEnabled}
                              onCheckedChange={(c) => handleToggle(auto.id, c)}
                              disabled={updateAutomation.isPending}
                            />
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-400 hover:bg-red-400/10 h-8 w-8" onClick={() => handleDelete(auto.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/5">
                          <ShieldAlert className="h-4 w-4 text-purple-400" />
                          <div className="text-sm">
                            <span className="text-muted-foreground">Action: </span>
                            <span className="capitalize font-medium text-white">{auto.actionType.replace(/_/g, " ")}</span>
                            {auto.actionPayload && (
                              <span className="ml-2 text-primary font-medium">"{auto.actionPayload}"</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                          <span>Triggered {auto.triggerCount} times</span>
                          <span>Created {format(new Date(auto.createdAt), "MMM d, yyyy")}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Live Event Feed */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/8 h-[600px] flex flex-col sticky top-6 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/5 flex items-center justify-between flex-shrink-0">
              <span className="font-semibold text-white text-sm">Live Executions</span>
              {isActive && connected && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
              )}
            </div>
            <div className="flex-1 bg-black/20 overflow-hidden">
              {!isActive ? (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                  <Activity className="h-8 w-8 mb-3 opacity-20" />
                  <p className="text-sm">Start a live session to see automations executing in real-time.</p>
                </div>
              ) : automationsFired.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Listening for triggers...
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-3">
                    <AnimatePresence>
                      {automationsFired.map((event, idx) => (
                        <motion.div
                          key={`${event.timestamp}-${idx}`}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="p-3 rounded-xl border border-primary/20 bg-primary/10"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-sm text-primary">{event.automationName}</span>
                            <span className="text-[10px] text-muted-foreground">{format(new Date(event.timestamp), "HH:mm:ss")}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Action: <span className="text-white capitalize">{event.actionType.replace(/_/g, " ")}</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            Triggered by: {event.triggerEvent.username || "Anonymous"} ({event.triggerEvent.type})
                          </p>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Automation Log Panel */}
      <div className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/8 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-white text-sm">Automation Log</span>
            {automationLogs && automationLogs.length > 0 && (
              <span className="text-xs text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full">
                last {automationLogs.length}
              </span>
            )}
          </div>
        </div>
        {logsLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-xl bg-white/[0.04]" />
            ))}
          </div>
        ) : !automationLogs || automationLogs.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No automation history yet. Triggers will be logged here once they fire.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-muted-foreground">
                  <th className="text-left px-4 py-2 font-medium">Time</th>
                  <th className="text-left px-4 py-2 font-medium">Rule</th>
                  <th className="text-left px-4 py-2 font-medium">Event</th>
                  <th className="text-left px-4 py-2 font-medium">Action</th>
                  <th className="text-left px-4 py-2 font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {automationLogs.map((log: import("@workspace/api-client-react").AutomationLogEntry) => {
                  const isSuccess = log.result === "success" || log.result.startsWith("success");
                  return (
                    <tr key={log.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(log.triggeredAt), { addSuffix: true })}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-white max-w-[180px] truncate">
                        {log.automationName}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="capitalize px-2 py-0.5 rounded-md bg-accent/10 text-accent border border-accent/20 text-[11px]">
                          {log.eventType}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="capitalize text-purple-300 text-[11px]">
                          {log.actionType.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {isSuccess ? (
                          <span className="flex items-center gap-1 text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            ok
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-400" title={log.result}>
                            <XCircle className="h-3 w-3" />
                            {log.result.replace("error:", "").slice(0, 30)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
