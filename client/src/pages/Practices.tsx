import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Search, Play, Clock, User, Star, Trash2, Edit, Volume2, Video } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Practice {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: string;
  instructor: string;
  videoUrl?: string;
  audioUrl?: string;
  isPremium: boolean;
  createdAt: string;
  isCompleted?: boolean;
  completedAt?: string;
}

export default function Practices() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: practices = [], isLoading } = useQuery<Practice[]>({
    queryKey: ["/api/practices"],
  });

  const completePracticeMutation = useMutation({
    mutationFn: async (practiceId: string) => {
      const response = await fetch(`/api/practices/${practiceId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to complete practice");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/practices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-practices"] });
      toast({
        title: "Practice Completed!",
        description: "Your progress has been recorded.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to complete practice",
        variant: "destructive",
      });
    },
  });

  const deletePracticeMutation = useMutation({
    mutationFn: async (practiceId: string) => {
      const response = await fetch(`/api/practices/${practiceId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete practice");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/practices"] });
      toast({
        title: "Practice Deleted",
        description: "The practice has been successfully removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete practice",
        variant: "destructive",
      });
    },
  });

  const filteredPractices = practices.filter(practice => {
    const matchesSearch = practice.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         practice.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         practice.instructor.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || practice.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categoryColors = {
    Calming: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    Energizing: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200", 
    Grounding: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    Dreamwork: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading practices...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Meditation Practices</h1>
          <p className="text-muted-foreground">
            Discover and create mindfulness practices for your integration journey
          </p>
        </div>
        <Button 
          onClick={() => setLocation("/practices/create")}
          className="flex items-center gap-2"
          data-testid="button-create-practice"
        >
          <Plus className="w-4 h-4" />
          Create Practice
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search practices by title, description, or instructor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-practices"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-category-filter">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Calming">Calming</SelectItem>
            <SelectItem value="Energizing">Energizing</SelectItem>
            <SelectItem value="Grounding">Grounding</SelectItem>
            <SelectItem value="Dreamwork">Dreamwork</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredPractices.length === 0 ? (
        <Card className="text-center p-12">
          <CardContent>
            <div className="space-y-4">
              <div className="text-6xl">🧘</div>
              <div>
                <h3 className="text-lg font-semibold">No practices found</h3>
                <p className="text-muted-foreground">
                  {searchQuery || categoryFilter !== "all" 
                    ? "Try adjusting your search or filter criteria."
                    : "Start your meditation library by creating your first practice."
                  }
                </p>
              </div>
              <Button onClick={() => setLocation("/practices/create")} data-testid="button-create-first-practice">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Practice
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPractices.map((practice) => (
            <Card key={practice.id} className="flex flex-col hover-elevate transition-shadow" data-testid={`card-practice-${practice.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{practice.title}</CardTitle>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge 
                        className={categoryColors[practice.category as keyof typeof categoryColors] || "bg-gray-100 text-gray-800"}
                        data-testid={`badge-category-${practice.id}`}
                      >
                        {practice.category}
                      </Badge>
                      {practice.isPremium && (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                          <Star className="w-3 h-3 mr-1" />
                          Premium
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {practice.duration}
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {practice.instructor}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1">
                <CardDescription className="mb-4">
                  {practice.description}
                </CardDescription>

                <div className="flex items-center gap-2 mb-4">
                  {practice.audioUrl && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Volume2 className="w-3 h-3" />
                      Audio
                    </Badge>
                  )}
                  {practice.videoUrl && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Video className="w-3 h-3" />
                      Video
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mt-auto">
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={() => completePracticeMutation.mutate(practice.id)}
                    disabled={completePracticeMutation.isPending}
                    data-testid={`button-complete-${practice.id}`}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {practice.isCompleted ? "Practice Again" : "Start Practice"}
                  </Button>
                  
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setLocation(`/practices/edit/${practice.id}`)}
                      data-testid={`button-edit-${practice.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          data-testid={`button-delete-${practice.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Practice</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{practice.title}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deletePracticeMutation.mutate(practice.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {practice.isCompleted && practice.completedAt && (
                  <div className="text-xs text-muted-foreground mt-2 text-center">
                    Last completed: {new Date(practice.completedAt).toLocaleDateString()}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}