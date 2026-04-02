import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { ArrowLeft, Play, X } from "lucide-react";

const editPracticeSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().min(10, "Description must be at least 10 characters").max(1000, "Description must be less than 1000 characters"),
  duration: z.string().min(1, "Duration is required"),
  category: z.enum(["Calming", "Energizing", "Grounding", "Dreamwork", "Somatic"], {
    required_error: "Please select a category",
  }),
  instructor: z.string().min(1, "Instructor name is required").max(100, "Instructor name must be less than 100 characters"),
  isPremium: z.boolean().default(false),
  videoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  audioUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type EditPracticeForm = z.infer<typeof editPracticeSchema>;

export default function EditPractice() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

  const { data: practice, isLoading: isLoadingPractice } = useQuery({
    queryKey: ["/api/practices", id],
    queryFn: async () => {
      const response = await fetch(`/api/practices/${id}`);
      if (!response.ok) throw new Error("Failed to fetch practice");
      return response.json();
    },
    enabled: !!id,
  });

  const form = useForm<EditPracticeForm>({
    resolver: zodResolver(editPracticeSchema),
    defaultValues: {
      title: "",
      description: "",
      duration: "",
      category: "Calming",
      instructor: "",
      isPremium: false,
      videoUrl: "",
      audioUrl: "",
    },
  });

  // Reset form when practice data is loaded
  useEffect(() => {
    if (practice) {
      form.reset({
        title: practice.title || "",
        description: practice.description || "",
        duration: practice.duration || "",
        category: practice.category || "Calming",
        instructor: practice.instructor || "",
        isPremium: practice.isPremium || false,
        videoUrl: practice.videoUrl || "",
        audioUrl: practice.audioUrl || "",
      });
    }
  }, [practice, form]);

  const updatePracticeMutation = useMutation({
    mutationFn: async (data: EditPracticeForm) => {
      const response = await fetch(`/api/practices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update practice");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/practices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/practices", id] });
      toast({
        title: "Practice Updated!",
        description: "Your meditation practice has been successfully updated.",
      });
      setLocation("/practices");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update practice",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditPracticeForm) => {
    // Clean up empty URLs
    const cleanData = {
      ...data,
      videoUrl: data.videoUrl || undefined,
      audioUrl: data.audioUrl || undefined,
    };
    updatePracticeMutation.mutate(cleanData);
  };

  const handleMediaPreview = (url: string, type: 'audio' | 'video') => {
    if (!url) return;
    
    try {
      new URL(url);
      if (type === 'audio') {
        setAudioPreview(url);
      } else {
        setVideoPreview(url);
      }
    } catch {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL",
        variant: "destructive",
      });
    }
  };

  if (isLoadingPractice) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading practice...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!practice) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Practice Not Found</h1>
          <p className="text-muted-foreground">The practice you're looking for doesn't exist.</p>
          <Button onClick={() => setLocation("/practices")}>
            Back to Practices
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          onClick={() => setLocation("/practices")}
          data-testid="button-back-to-practices"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Practices
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Edit Practice</CardTitle>
          <CardDescription>
            Update your meditation practice details and content.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Practice Title</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Morning Breath Awareness"
                          data-testid="input-practice-title"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., 15 min, 30 min, 1 hour"
                          data-testid="input-practice-duration"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe your practice, its benefits, and what participants can expect..."
                        rows={4}
                        data-testid="textarea-practice-description"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-practice-category">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Calming">Calming</SelectItem>
                          <SelectItem value="Energizing">Energizing</SelectItem>
                          <SelectItem value="Grounding">Grounding</SelectItem>
                          <SelectItem value="Dreamwork">Dreamwork</SelectItem>
                          <SelectItem value="Somatic">Somatic</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="instructor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instructor/Creator</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Your name or instructor name"
                          data-testid="input-practice-instructor"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Media Content (Optional)</h3>
                
                <FormField
                  control={form.control}
                  name="audioUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Audio URL</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input 
                            placeholder="https://example.com/your-audio-file.mp3"
                            data-testid="input-practice-audio-url"
                            {...field} 
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => handleMediaPreview(field.value || '', 'audio')}
                          disabled={!field.value}
                          data-testid="button-preview-audio"
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      </div>
                      <FormDescription>
                        Add a direct link to your audio file (mp3, wav, etc.)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {audioPreview && (
                  <div className="bg-secondary/50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Audio Preview:</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setAudioPreview(null)}
                        data-testid="button-close-audio-preview"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <audio controls className="w-full" data-testid="audio-preview">
                      <source src={audioPreview} />
                      Your browser does not support audio playback.
                    </audio>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="videoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Video URL</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input 
                            placeholder="https://example.com/your-video-file.mp4 or YouTube/Vimeo link"
                            data-testid="input-practice-video-url"
                            {...field} 
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => handleMediaPreview(field.value || '', 'video')}
                          disabled={!field.value}
                          data-testid="button-preview-video"
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      </div>
                      <FormDescription>
                        Add a direct link to your video file or YouTube/Vimeo URL
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {videoPreview && (
                  <div className="bg-secondary/50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Video Preview:</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setVideoPreview(null)}
                        data-testid="button-close-video-preview"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="aspect-video bg-black rounded-lg overflow-hidden">
                      <video controls className="w-full h-full" data-testid="video-preview">
                        <source src={videoPreview} />
                        Your browser does not support video playback.
                      </video>
                    </div>
                  </div>
                )}
              </div>

              <FormField
                control={form.control}
                name="isPremium"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Premium Content</FormLabel>
                      <FormDescription>
                        Mark this practice as premium content requiring subscription access.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-premium-content"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4 pt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setLocation("/practices")}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updatePracticeMutation.isPending}
                  data-testid="button-update-practice"
                >
                  {updatePracticeMutation.isPending ? "Updating..." : "Update Practice"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}