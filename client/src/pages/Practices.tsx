import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Search, Play, Clock, User, Star, Trash2, Edit, Volume2, Video, CheckCircle, RotateCcw, Loader2 } from "lucide-react";
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

function isYouTubeUrl(url: string) {
  return url.includes("youtube.com") || url.includes("youtu.be");
}

function getYouTubeEmbedUrl(url: string) {
  const match = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : url;
}

function isVimeoUrl(url: string) {
  return url.includes("vimeo.com");
}

function getVimeoEmbedUrl(url: string) {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? `https://player.vimeo.com/video/${match[1]}` : url;
}

function isObjectStoragePath(url: string) {
  return url.startsWith('/objects/');
}

export default function Practices() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedPractice, setSelectedPractice] = useState<Practice | null>(null);
  const search = useSearch();

  const { data: user } = useQuery<{ isAdmin?: boolean }>({ queryKey: ["/api/auth/user"] });
  const isAdmin = (user as any)?.isAdmin;

  // Fetch signed URL for audio (bypasses auth/SW issues with <audio> element)
  const { data: audioUrlData, isLoading: audioUrlLoading } = useQuery<{ url: string }>({
    queryKey: ['/api/practices', selectedPractice?.id, 'media-url', 'audio'],
    enabled: !!selectedPractice?.audioUrl && isObjectStoragePath(selectedPractice.audioUrl),
    staleTime: 30 * 60 * 1000, // 30 min (signed URL is valid 1 hr)
  });

  // Fetch signed URL for stored video files (not YouTube/Vimeo)
  const { data: videoUrlData, isLoading: videoUrlLoading } = useQuery<{ url: string }>({
    queryKey: ['/api/practices', selectedPractice?.id, 'media-url', 'video'],
    enabled: !!selectedPractice?.videoUrl &&
      isObjectStoragePath(selectedPractice.videoUrl) &&
      !isYouTubeUrl(selectedPractice.videoUrl) &&
      !isVimeoUrl(selectedPractice.videoUrl),
    staleTime: 30 * 60 * 1000,
  });

  const { data: practices = [], isLoading } = useQuery<Practice[]>({
    queryKey: ["/api/practices"],
  });

  // Auto-open dialog when navigated here with ?play=<id> (e.g. from Dashboard)
  useEffect(() => {
    if (!practices.length) return;
    const params = new URLSearchParams(search);
    const playId = params.get("play");
    if (playId && !selectedPractice) {
      const practice = practices.find((p) => p.id === playId);
      if (practice) setSelectedPractice(practice);
    }
  }, [search, practices]);

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
      queryClient.invalidateQueries({ queryKey: ["/api/streaks"] });
      toast({
        title: "Practice Completed",
        description: "Great work! Your progress has been saved.",
      });
      if (selectedPractice) {
        setSelectedPractice((p) => p ? { ...p, isCompleted: true } : null);
      }
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
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || "Failed to delete practice");
      }
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

  const categoryColors: Record<string, string> = {
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-wrap">
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
              <div className="flex justify-center">
                <Play className="w-12 h-12 text-muted-foreground" />
              </div>
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
            <Card key={practice.id} className="flex flex-col" data-testid={`card-practice-${practice.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{practice.title}</CardTitle>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge
                        className={categoryColors[practice.category] || "bg-gray-100 text-gray-800"}
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
                      {practice.isCompleted && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Done
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

              <CardContent className="flex-1 flex flex-col">
                <CardDescription className="mb-4 flex-1">
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
                    onClick={() => setSelectedPractice(practice)}
                    data-testid={`button-complete-${practice.id}`}
                  >
                    {practice.isCompleted ? (
                      <>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Practice Again
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Start Practice
                      </>
                    )}
                  </Button>

                  {isAdmin && (
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => setLocation(`/practices/edit/${practice.id}`)}
                        data-testid={`button-edit-${practice.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="outline"
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
                              className="bg-destructive text-destructive-foreground"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
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

      {/* Practice Player Dialog */}
      <Dialog open={!!selectedPractice} onOpenChange={(open) => { if (!open) setSelectedPractice(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-practice-player">
          {selectedPractice && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedPractice.title}</DialogTitle>
                <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {selectedPractice.duration}
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {selectedPractice.instructor}
                  </div>
                  <Badge className={categoryColors[selectedPractice.category] || "bg-gray-100 text-gray-800"}>
                    {selectedPractice.category}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="space-y-5">
                <p className="text-muted-foreground leading-relaxed">{selectedPractice.description}</p>

                {/* Audio Player */}
                {selectedPractice.audioUrl && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Volume2 className="w-4 h-4" />
                      Audio Guide
                    </p>
                    {isObjectStoragePath(selectedPractice.audioUrl) ? (
                      audioUrlLoading ? (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading audio...
                        </div>
                      ) : audioUrlData?.url ? (
                        <audio
                          controls
                          className="w-full rounded-md"
                          src={audioUrlData.url}
                          data-testid="audio-practice-player"
                        >
                          Your browser does not support the audio element.
                        </audio>
                      ) : (
                        <p className="text-sm text-destructive">Unable to load audio.</p>
                      )
                    ) : (
                      <audio
                        controls
                        className="w-full rounded-md"
                        src={selectedPractice.audioUrl}
                        data-testid="audio-practice-player"
                      >
                        Your browser does not support the audio element.
                      </audio>
                    )}
                  </div>
                )}

                {/* Video Player */}
                {selectedPractice.videoUrl && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Video className="w-4 h-4" />
                      Video Guide
                    </p>
                    {isYouTubeUrl(selectedPractice.videoUrl) ? (
                      <iframe
                        src={getYouTubeEmbedUrl(selectedPractice.videoUrl)}
                        className="w-full aspect-video rounded-md"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        data-testid="video-practice-player"
                      />
                    ) : isVimeoUrl(selectedPractice.videoUrl) ? (
                      <iframe
                        src={getVimeoEmbedUrl(selectedPractice.videoUrl)}
                        className="w-full aspect-video rounded-md"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                        data-testid="video-practice-player"
                      />
                    ) : isObjectStoragePath(selectedPractice.videoUrl) ? (
                      videoUrlLoading ? (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading video...
                        </div>
                      ) : videoUrlData?.url ? (
                        <video
                          controls
                          className="w-full rounded-md"
                          src={videoUrlData.url}
                          data-testid="video-practice-player"
                        >
                          Your browser does not support the video element.
                        </video>
                      ) : (
                        <p className="text-sm text-destructive">Unable to load video.</p>
                      )
                    ) : (
                      <video
                        controls
                        className="w-full rounded-md"
                        src={selectedPractice.videoUrl}
                        data-testid="video-practice-player"
                      >
                        Your browser does not support the video element.
                      </video>
                    )}
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() => completePracticeMutation.mutate(selectedPractice.id)}
                    disabled={completePracticeMutation.isPending}
                    data-testid="button-mark-complete"
                  >
                    {completePracticeMutation.isPending ? (
                      "Saving..."
                    ) : selectedPractice.isCompleted ? (
                      <>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Practice Again
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark as Complete
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
