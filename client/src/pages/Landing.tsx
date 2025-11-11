import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Users, TrendingUp, BookOpen, Star, Sparkles } from "lucide-react";
import heroImage from "@assets/ChatGPT Image Nov 11, 2025, 01_49_21 PM_1762840174353.png";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  const features = [
    {
      icon: BookOpen,
      title: "77-Day Journey",
      description: "Guided prompts through Body, Emotion, Social, Environment, Spirit, and Mental practices."
    },
    {
      icon: Sparkles,
      title: "Daily Reflections",
      description: "Thoughtful prompts and micro-practices for meaningful integration."
    },
    {
      icon: TrendingUp,
      title: "Track Progress",
      description: "Visualize your wellbeing journey with beautiful charts and streaks."
    },
    {
      icon: Users,
      title: "Community",
      description: "Connect with others on similar healing paths."
    },
    {
      icon: Star,
      title: "Guided Practices",
      description: "Meditation, breathwork, and grounding exercises."
    },
    {
      icon: Heart,
      title: "Holistic Healing",
      description: "Ancient wisdom meets modern wellness."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section with Full-Width Image */}
      <div className="relative w-full min-h-[85vh] flex items-center justify-center overflow-hidden">
        {/* Hero Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60 z-10" />
          <img 
            src={heroImage} 
            alt="Integration Journey" 
            className="w-full h-full object-cover"
            data-testid="img-hero"
          />
        </div>

        {/* Hero Content */}
        <div className="relative z-20 mx-auto max-w-5xl px-6 py-16 text-center">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6 text-white drop-shadow-lg">
            Integration Compass
          </h1>
          
          <p className="text-xl sm:text-2xl md:text-3xl leading-relaxed text-white/90 mb-4 drop-shadow-md font-light">
            Your Guide Through the Journey
          </p>
          
          <p className="text-base sm:text-lg text-white/80 mb-10 max-w-2xl mx-auto drop-shadow-md">
            Support your ayahuasca integration with guided practices, 
            community connection, and personalized tools for lasting transformation.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={handleLogin}
              data-testid="button-login"
              className="px-10 py-7 text-lg shadow-2xl bg-primary hover:bg-primary/90 backdrop-blur-sm border border-white/20"
            >
              Begin Your Journey
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="px-10 py-7 text-lg shadow-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md border-white/30 text-white"
              data-testid="button-learn-more"
            >
              Learn More
            </Button>
          </div>
        </div>
      </div>

      {/* Features Grid - Condensed */}
      <div className="py-20 sm:py-28 bg-gradient-to-b from-background to-card/30">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Everything You Need
            </h2>
            <p className="text-lg text-muted-foreground">
              Tools for every aspect of your healing journey
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Card 
                  key={index} 
                  className="relative overflow-hidden hover-elevate transition-all duration-300 border-primary/10 bg-gradient-to-br from-card to-card/50"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
                        <IconComponent className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* CTA Section - Simplified */}
      <div className="py-20 sm:py-28 bg-gradient-to-br from-primary/5 via-accent/10 to-primary/5">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6">
            Ready to Begin?
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
            Start your 77-day integration journey with intention, support, and evidence-based practices.
          </p>
          <Button 
            size="lg" 
            onClick={handleLogin}
            data-testid="button-get-started"
            className="px-10 py-7 text-lg shadow-xl"
          >
            Get Started Today
          </Button>
        </div>
      </div>
    </div>
  );
}
