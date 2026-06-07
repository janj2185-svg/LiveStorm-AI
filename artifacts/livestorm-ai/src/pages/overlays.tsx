import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Copy, MonitorPlay, MessageSquare, Trophy, Shield } from "lucide-react";

export function Overlays() {
  const { toast } = useToast();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  
  // In a real app, this would use the user's ID
  const dummyOverlayId = "overlay_abc123";
  const baseUrl = `${window.location.origin}${basePath}`;

  const overlays = [
    {
      id: "event-feed",
      name: "Event Feed",
      icon: MessageSquare,
      desc: "Real-time scrolling feed of gifts, likes, and follows.",
      url: `${baseUrl}/overlay/${dummyOverlayId}/feed`
    },
    {
      id: "leaderboard",
      name: "Top Supporters",
      icon: Trophy,
      desc: "Live ranking of your top gift senders.",
      url: `${baseUrl}/overlay/${dummyOverlayId}/leaderboard`
    },
    {
      id: "kingdom-status",
      name: "Kingdom Status",
      icon: Shield,
      desc: "Shows current kingdom level and recent upgrades.",
      url: `${baseUrl}/overlay/${dummyOverlayId}/kingdom`
    }
  ];

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "Copied to clipboard",
      description: "Paste this URL into an OBS Browser Source.",
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">OBS Overlays</h2>
        <p className="text-muted-foreground">Browser source URLs to add gamification to your stream.</p>
      </div>

      <Card className="bg-primary/5 border-primary/20 mb-8">
        <CardContent className="p-6 flex items-start gap-4">
          <MonitorPlay className="w-8 h-8 text-primary shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-white text-lg mb-2">How to use overlays</h3>
            <ol className="list-decimal list-inside text-muted-foreground space-y-1 text-sm">
              <li>Copy the overlay URL below.</li>
              <li>Open OBS (or Streamlabs).</li>
              <li>Add a new <strong>Browser Source</strong>.</li>
              <li>Paste the URL and set width/height as desired.</li>
              <li>Check "Transparent background".</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {overlays.map((overlay) => (
          <Card key={overlay.id} className="bg-card border-white/5 hover:border-white/10 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <overlay.icon className="w-5 h-5 text-accent" />
                {overlay.name}
              </CardTitle>
              <CardDescription>{overlay.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mt-4">
                <div className="flex items-center gap-2">
                  <Input 
                    readOnly 
                    value={overlay.url} 
                    className="bg-background font-mono text-xs text-muted-foreground border-border"
                  />
                  <Button 
                    size="icon" 
                    variant="outline" 
                    onClick={() => handleCopy(overlay.url)}
                    className="shrink-0 border-border hover:bg-white/5"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
