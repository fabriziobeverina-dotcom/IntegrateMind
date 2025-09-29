import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, VideoIcon, Upload, Play, X, FileVideo, Image } from "lucide-react";
import { Link } from "wouter";

const createVideoSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().min(10, "Description must be at least 10 characters").max(1000, "Description must be less than 1000 characters"),
  videoUrl: z.string().url("Must be a valid video URL"),
  thumbnailUrl: z.string().url("Must be a valid image URL").optional().or(z.literal("")),
  instructor: z.string().min(1, "Instructor name is required").max(100, "Instructor name must be less than 100 characters").optional().or(z.literal("")),
  duration: z.string().optional().or(z.literal("")),
  category: z.enum(["Educational", "Testimonial", "Workshop", "Guided Session"], {
    required_error: "Please select a category",
  }),
  tags: z.string().optional().or(z.literal("")),
  isFeatured: z.boolean().default(false),
  isPremium: z.boolean().default(false),
});

type CreateVideoForm = z.infer<typeof createVideoSchema>;

export default function CreateVideo() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = (user as any)?.isAdmin;
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  const form = useForm<CreateVideoForm>({
    resolver: zodResolver(createVideoSchema),
    defaultValues: {
      title: "",
      description: "",
      videoUrl: "",
      thumbnailUrl: "",
      instructor: "",
      duration: "",
      category: "Educational",
      tags: "",
      isFeatured: false,
      isPremium: false,
    },
  });

  const createVideoMutation = useMutation({
    mutationFn: async (data: CreateVideoForm) => {
      // Convert tags string to array
      const processedData = {
        ...data,
        tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [],
        instructor: data.instructor || undefined,
        duration: data.duration || undefined,
        thumbnailUrl: data.thumbnailUrl || undefined,
      };

      const response = await fetch("/api/admin/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(processedData),
        credentials: 'include',
      });
      if (!response.ok) throw new Error("Failed to create video");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/videos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      toast({
        title: "Video Created!",
        description: "Your video has been successfully created.",
      });
      setLocation("/admin/videos");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create video",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateVideoForm) => {
    createVideoMutation.mutate(data);
  };

  const handleVideoPreview = (url: string) => {
    if (!url) return;
    
    try {
      new URL(url);
      setVideoPreview(url);
    } catch {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid video URL",
        variant: "destructive",
      });
    }
  };

  const handleThumbnailPreview = (url: string) => {
    if (!url) return;
    
    try {
      new URL(url);
      setThumbnailPreview(url);
    } catch {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid image URL",
        variant: "destructive",
      });
    }
  };

  // Check if user is admin
  if (!isAdmin) {
    return (
      <div className="p-8">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Admin Access Required</h1>
          <p className="text-muted-foreground mb-4">
            You need admin privileges to create new videos. Only admin users can add content to the platform.
          </p>
          <div className="space-y-2">
            <Link href="/videos">
              <Button className="w-full">Browse Videos</Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full">Return to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          onClick={() => setLocation("/admin/videos")}
          data-testid="button-back-to-videos"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Manage Videos
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <VideoIcon className="h-6 w-6" />
            Create New Video
          </CardTitle>
          <CardDescription>
            Add a new educational video, workshop, or testimonial to the platform library.
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
                      <FormLabel>Video Title</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Integration Workshop: Finding Your Path"
                          data-testid="input-video-title"
                          {...field} 
                        />
                      </FormControl>
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
                          placeholder="e.g., Dr. Sarah Wilson"
                          data-testid="input-video-instructor"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>Optional - Leave blank if anonymous</FormDescription>
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
                        placeholder="Describe what viewers will learn from this video, its key topics, and benefits..."
                        rows={4}
                        data-testid="textarea-video-description"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>This will appear in the video list as a preview</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Video Content</h3>
                
                <FormField
                  control={form.control}
                  name="videoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Video URL</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input 
                            placeholder="https://example.com/video.mp4 or YouTube/Vimeo URL"
                            data-testid="input-video-url"
                            {...field} 
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => handleVideoPreview(field.value || '')}
                          disabled={!field.value}
                          data-testid="button-preview-video"
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      </div>
                      <FormDescription>
                        Direct video file URL, YouTube, Vimeo, or other video platform link
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

                <FormField
                  control={form.control}
                  name="thumbnailUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Thumbnail Image URL</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input 
                            placeholder="https://example.com/thumbnail.jpg"
                            data-testid="input-thumbnail-url"
                            {...field} 
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => handleThumbnailPreview(field.value || '')}
                          disabled={!field.value}
                          data-testid="button-preview-thumbnail"
                        >
                          <Image className="w-4 h-4" />
                        </Button>
                      </div>
                      <FormDescription>
                        Optional - A preview image for the video
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {thumbnailPreview && (
                  <div className="bg-secondary/50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Thumbnail Preview:</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setThumbnailPreview(null)}
                        data-testid="button-close-thumbnail-preview"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <img 
                      src={thumbnailPreview} 
                      alt="Thumbnail preview"
                      className="w-full max-w-md h-auto rounded-lg"
                      data-testid="thumbnail-preview"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-video-category">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Educational">Educational</SelectItem>
                          <SelectItem value="Testimonial">Testimonial</SelectItem>
                          <SelectItem value="Workshop">Workshop</SelectItem>
                          <SelectItem value="Guided Session">Guided Session</SelectItem>
                        </SelectContent>
                      </Select>
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
                          placeholder="e.g., 45 min, 1.5 hours"
                          data-testid="input-video-duration"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>Optional estimated duration</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="healing, workshop, integration"
                          data-testid="input-video-tags"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>Comma-separated tags for better discovery</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Content Settings</h3>
                
                <FormField
                  control={form.control}
                  name="isFeatured"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Featured Content</FormLabel>
                        <FormDescription>
                          Highlight this video in the featured section for better visibility.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-featured-content"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isPremium"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Premium Content</FormLabel>
                        <FormDescription>
                          Mark this video as premium content requiring subscription access.
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
              </div>

              <div className="flex justify-end gap-4 pt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setLocation("/admin/videos")}
                  data-testid="button-cancel-create"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createVideoMutation.isPending}
                  data-testid="button-create-video"
                >
                  {createVideoMutation.isPending ? "Creating..." : "Create Video"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}