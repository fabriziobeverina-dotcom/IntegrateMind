import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Compass, Heart, Users, TrendingUp, BookOpen, Star } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  const features = [
    {
      icon: BookOpen,
      title: "Personal Journaling",
      description: "Guided prompts and tagging system to support your integration process with thoughtful reflection."
    },
    {
      icon: Compass,
      title: "Daily Practices",
      description: "Curated library of meditation, breathwork, and grounding exercises to support your healing journey."
    },
    {
      icon: TrendingUp,
      title: "Progress Tracking",
      description: "Monitor your mood, sleep, and grounding with beautiful visualizations and streak tracking."
    },
    {
      icon: Users,
      title: "Community Support",
      description: "Connect with others on similar journeys through discussion boards and group chat rooms."
    },
    {
      icon: Star,
      title: "AI-Powered Insights",
      description: "Premium AI reflections on your journal entries to deepen your understanding and integration."
    },
    {
      icon: Heart,
      title: "Holistic Approach",
      description: "Combining ancient wisdom with modern wellness practices for comprehensive healing support."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="flex justify-center mb-8">
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
                <Compass className="h-12 w-12 text-primary" />
              </div>
            </div>
            
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-6">
              Your <span className="text-primary">Integration Compass</span>
            </h1>
            
            <p className="text-lg leading-8 text-muted-foreground mb-8">
              A comprehensive platform designed to support your ayahuasca integration journey 
              with personalized tools, community connection, and guided practices for lasting transformation.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={handleLogin}
                data-testid="button-login"
                className="px-8 py-3 text-lg"
              >
                Begin Your Journey
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="px-8 py-3 text-lg"
                data-testid="button-learn-more"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              Everything you need for integration
            </h2>
            <p className="text-lg text-muted-foreground">
              Thoughtfully designed tools to support every aspect of your healing journey
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Card key={index} className="relative overflow-hidden hover-elevate transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <IconComponent className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      <div className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-16 text-center">
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                Ready to begin your integration journey?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join thousands of others who are using Integration Compass to navigate 
                their healing journey with intention, support, and evidence-based practices.
              </p>
              <Button 
                size="lg" 
                onClick={handleLogin}
                data-testid="button-get-started"
                className="px-8 py-3 text-lg"
              >
                Get Started Today
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}