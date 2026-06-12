import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Zap, Shield, Trophy, Users, Play, Crown } from "lucide-react";

export function Home() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <div className="min-h-[100dvh] bg-background text-foreground selection:bg-primary/30">
      {/* Navbar */}
      <header className="fixed top-0 w-full z-50 border-b border-white/10 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={`${basePath}/logo.svg`} alt="Logo" className="w-8 h-8" />
            <span className="font-bold text-xl tracking-tight text-white">LiveStorm AI</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/sign-in">
              <Button variant="ghost" className="text-muted-foreground hover:text-white" data-testid="link-login">
                Log in
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(124,58,237,0.4)]" data-testid="link-signup">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-32 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-background to-background -z-10" />
        
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary mb-6 text-sm font-medium">
              <Zap className="w-4 h-4" />
              <span>Next-Generation TikTok LIVE Platform</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black text-white mb-8 leading-tight tracking-tighter">
              Turn Your Stream Into A <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                Living Game
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Engage viewers with real-time AI progression, epic overlays, and interactive kingdoms. 
              Build loyalty through gamification.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/sign-up">
                <Button size="lg" className="w-full sm:w-auto text-lg h-14 px-8 bg-primary hover:bg-primary/90 shadow-[0_0_30px_rgba(124,58,237,0.5)]">
                  Start Broadcasting Free
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto text-lg h-14 px-8 border-white/20 hover:bg-white/5"
                onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              >
                <Play className="w-5 h-5 mr-2" />
                Watch Demo
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section className="py-10 px-4 relative z-10">
        <div className="container mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative rounded-2xl border border-white/10 bg-card/50 p-2 md:p-4 shadow-2xl backdrop-blur-sm overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10" />
            <img 
              src={`${basePath}/hero-dashboard.png`} 
              alt="LiveStorm AI Dashboard Preview" 
              className="w-full h-auto rounded-lg md:rounded-xl shadow-2xl border border-white/5"
            />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 bg-black/40 border-y border-white/5">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Command Your Audience</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A complete mission control center for your TikTok LIVE streams. Every tool you need to maximize engagement and revenue.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Trophy,
                title: "RPG Gamification",
                desc: "Viewers earn XP, level up, and unlock achievements just by watching and interacting."
              },
              {
                icon: Crown,
                title: "Interactive Kingdoms",
                desc: "Build a digital empire. Viewers contribute resources through likes and gifts to upgrade your kingdom."
              },
              {
                icon: Users,
                title: "AI Assistant",
                desc: "An intelligent chatbot that welcomes viewers, answers FAQs, and hypes up your top supporters."
              }
            ].map((feat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 rounded-2xl bg-card border border-white/5 hover:border-primary/50 transition-colors group"
              >
                <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feat.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feat.title}</h3>
                <p className="text-muted-foreground">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10 bg-background text-center text-muted-foreground">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img src={`${basePath}/logo.svg`} alt="Logo" className="w-6 h-6 grayscale opacity-50" />
            <span className="font-bold text-lg tracking-tight">LiveStorm AI</span>
          </div>
          <p>© {new Date().getFullYear()} LiveStorm AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
