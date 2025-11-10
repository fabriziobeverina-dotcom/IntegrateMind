import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Users, TrendingUp, BookOpen, Star, Sparkles } from "lucide-react";
import logoImage from "@assets/ChatGPT Image Nov 10, 2025, 05_44_07 PM_1762767858454.png";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  const features = [
    {
      icon: BookOpen,
      title: "77-Day Journey",
      description: "Guided daily prompts cycling through Body, Emotion, Social, Environment, Spirit, and Mental integration practices."
    },
    {
      icon: Sparkles,
      title: "Personal Journaling",
      description: "Thoughtful reflection prompts and micro-practices to support your integration process with intention."
    },
    {
      icon: TrendingUp,
      title: "Progress Tracking",
      description: "Monitor your wellbeing, mood, and grounding with beautiful visualizations and streak tracking."
    },
    {
      icon: Users,
      title: "Community Support",
      description: "Connect with others on similar journeys through discussion boards and shared experiences."
    },
    {
      icon: Star,
      title: "Guided Practices",
      description: "Curated library of meditation, breathwork, and grounding exercises to support your healing."
    },
    {
      icon: Heart,
      title: "Holistic Approach",
      description: "Combining ancient wisdom with modern wellness practices for comprehensive healing support."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-card/30 to-background">
      <div className="relative overflow-hidden">
        {/* Hero Section with Logo */}
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <img 
                  src={logoImage} 
                  alt="Integration Compass Logo" 
                  className="h-48 w-48 sm:h-56 sm:w-56 rounded-3xl shadow-2xl"
                  data-testid="img-logo"
                />
              </div>
            </div>
            
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Integration Compass
            </h1>
            
            <p className="text-xl leading-8 text-muted-foreground mb-4">
              Your guide through the ayahuasca integration journey
            </p>
            
            <p className="text-base leading-7 text-muted-foreground mb-8 max-w-2xl mx-auto">
              A comprehensive platform designed to support your healing with personalized tools, 
              community connection, and guided practices for lasting transformation.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={handleLogin}
                data-testid="button-login"
                className="px-8 py-6 text-lg shadow-lg"
              >
                Begin Your Journey
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="px-8 py-6 text-lg"
                data-testid="button-learn-more"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              Everything you need for integration
            </h2>
            <p className="text-lg text-muted-foreground">
              Thoughtfully designed tools to support every aspect of your healing journey
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Card key={index} className="relative overflow-hidden hover-elevate transition-all duration-300 border-primary/10">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-primary/10">
                        <IconComponent className="h-5 w-5 text-primary" />
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

      {/* CTA Section */}
      <div className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <Card className="bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 border-primary/20">
            <CardContent className="py-16 text-center">
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                Ready to begin your integration journey?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join others who are using Integration Compass to navigate 
                their healing journey with intention, support, and grounding practices.
              </p>
              <Button 
                size="lg" 
                onClick={handleLogin}
                data-testid="button-get-started"
                className="px-8 py-6 text-lg shadow-lg"
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
