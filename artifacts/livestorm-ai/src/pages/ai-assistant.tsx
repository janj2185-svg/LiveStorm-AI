import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Bot, MessageSquare, Send } from "lucide-react";

export function AiAssistant() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">AI Co-Host</h2>
        <p className="text-muted-foreground">Configure your intelligent chat moderator.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="lg:col-span-1 space-y-6 overflow-y-auto pr-2">
          <Card className="bg-card border-white/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                Assistant Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="ai-active" className="text-base cursor-pointer">Activate AI</Label>
                <Switch id="ai-active" defaultChecked />
              </div>
              <div className="p-3 rounded bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium text-center">
                AI is monitoring chat
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-white/5">
            <CardHeader>
              <CardTitle className="text-lg">Behavior Rules</CardTitle>
              <CardDescription>How the AI should act in chat.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-greet" className="text-sm">Auto-greet new viewers</Label>
                <Switch id="auto-greet" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="thank-gifts" className="text-sm">Thank for gifts</Label>
                <Switch id="thank-gifts" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="answer-faqs" className="text-sm">Answer FAQs</Label>
                <Switch id="answer-faqs" defaultChecked />
              </div>
              
              <div className="pt-4 space-y-2">
                <Label htmlFor="custom-prompt">Custom Persona Prompt</Label>
                <Textarea 
                  id="custom-prompt" 
                  placeholder="E.g. You are a hype-man for the streamer. Use lots of exclamation points."
                  className="bg-background border-border min-h-[100px] text-sm"
                  defaultValue="You are the cyber-assistant for this stream. Keep responses short, hyped, and use gamer terminology."
                />
                <Button className="w-full mt-2" size="sm">Save Persona</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="bg-card border-white/5 h-full flex flex-col">
            <CardHeader className="border-b border-border py-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-accent" />
                Live Chat Simulation
              </CardTitle>
              <CardDescription>Test how your AI responds to messages.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0 flex flex-col bg-black/20">
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                <div className="flex flex-col gap-1 max-w-[80%]">
                  <span className="text-xs font-bold text-muted-foreground">viewer_1</span>
                  <div className="bg-white/10 p-3 rounded-lg rounded-tl-none text-sm text-white">
                    What game is he playing?
                  </div>
                </div>
                
                <div className="flex flex-col gap-1 max-w-[80%] self-end items-end">
                  <span className="text-xs font-bold text-primary flex items-center gap-1">
                    <Bot className="w-3 h-3" /> LiveStorm AI
                  </span>
                  <div className="bg-primary/20 border border-primary/30 p-3 rounded-lg rounded-tr-none text-sm text-white">
                    The commander is currently playing Cyberpunk 2077! Drop a like to boost the stream! 🚀
                  </div>
                </div>
              </div>
              
              <div className="p-4 border-t border-border bg-card/50">
                <div className="flex gap-2">
                  <Input 
                    placeholder="Type a test message..." 
                    className="bg-background border-border"
                  />
                  <Button size="icon" className="bg-primary hover:bg-primary/90 shrink-0">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
