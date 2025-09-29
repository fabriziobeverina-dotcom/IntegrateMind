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
import { ArrowLeft, Upload, Play, X, FileAudio, FileVideo } from "lucide-react";
import { Link } from "wouter";

const createPracticeSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().min(10, "Description must be at least 10 characters").max(1000, "Description must be less than 1000 characters"),
  duration: z.string().min(1, "Duration is required"),
  category: z.enum(["Calming", "Energizing", "Grounding", "Dreamwork"], {
    required_error: "Please select a category",
  }),
  instructor: z.string().min(1, "Instructor name is required").max(100, "Instructor name must be less than 100 characters"),
  isPremium: z.boolean().default(false),
  videoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  audioUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type CreatePracticeForm = z.infer<typeof createPracticeSchema>;

export default function CreatePractice() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = (user as any)?.isAdmin;
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const form = useForm<CreatePracticeForm>({
    resolver: zodResolver(createPracticeSchema),
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

  const createPracticeMutation = useMutation({
    mutationFn: async (data: CreatePracticeForm) => {
      const response = await fetch("/api/admin/practices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!response.ok) throw new Error("Failed to create practice");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/practices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/practices"] });
      toast({
        title: "Practice Created!",
        description: "Your meditation practice has been successfully created.",
      });
      setLocation("/admin/practices");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create practice",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreatePracticeForm) => {
    // Clean up empty URLs
    const cleanData = {
      ...data,
      videoUrl: data.videoUrl || undefined,
      audioUrl: data.audioUrl || undefined,
    };
    createPracticeMutation.mutate(cleanData);
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

  const handleFileUpload = async (file: File, type: 'audio' | 'video') => {
    if (type === 'audio') setUploadingAudio(true);
    else setUploadingVideo(true);

    try {
      // Step 1: Get presigned URL
      const fileExtension = file.name.split('.').pop();
      const uploadResponse = await fetch('/api/objects/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileExtension,
          mimeType: file.type,
        }),
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadURL, objectPath } = await uploadResponse.json();

      // Step 2: Upload file directly to object storage
      const putResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!putResponse.ok) {
        throw new Error('Failed to upload file');
      }

      // Step 3: Finalize upload and set ACL
      const finalizeResponse = await fetch('/api/objects/finalize', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          objectPath,
        }),
      });

      if (!finalizeResponse.ok) {
        throw new Error('Failed to finalize upload');
      }

      const { url } = await finalizeResponse.json();
      
      // Update the form with the uploaded file URL
      if (type === 'audio') {
        form.setValue('audioUrl', url);
        setAudioPreview(url);
      } else {
        form.setValue('videoUrl', url);
        setVideoPreview(url);
      }

      toast({
        title: "Upload Successful",
        description: `Your ${type} file has been uploaded successfully.`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: `Failed to upload ${type} file. Please try again.`,
        variant: "destructive",
      });
    } finally {
      if (type === 'audio') setUploadingAudio(false);
      else setUploadingVideo(false);
    }
  };

  // Check if user is admin
  if (!isAdmin) {
    return (
      <div className="p-8">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Admin Access Required</h1>
          <p className="text-muted-foreground mb-4">
            You need admin privileges to create new practices. Only admin users can add content to the platform.
          </p>
          <div className="space-y-2">
            <Link href="/practices">
              <Button className="w-full">Browse Practices</Button>
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
          onClick={() => setLocation("/admin/practices")}
          data-testid="button-back-to-practices"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Manage Practices
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create New Practice</CardTitle>
          <CardDescription>
            Add a new meditation practice, guided exercise, or wellness content to the platform library.
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      <FormLabel>Audio Content</FormLabel>
                      
                      {/* File Upload Section */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={uploadingAudio}
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'audio/*';
                              input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file) handleFileUpload(file, 'audio');
                              };
                              input.click();
                            }}
                            data-testid="button-upload-audio"
                          >
                            {uploadingAudio ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                                Uploading...
                              </>
                            ) : (
                              <>
                                <FileAudio className="w-4 h-4 mr-2" />
                                Upload Audio File
                              </>
                            )}
                          </Button>
                          <span className="text-sm text-muted-foreground">or</span>
                        </div>
                        
                        {/* URL Input Section */}
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
                      </div>
                      
                      <FormDescription>
                        Upload an audio file (mp3, wav, etc.) or provide a direct link
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
                      <FormLabel>Video Content</FormLabel>
                      
                      {/* File Upload Section */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={uploadingVideo}
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'video/*';
                              input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file) handleFileUpload(file, 'video');
                              };
                              input.click();
                            }}
                            data-testid="button-upload-video"
                          >
                            {uploadingVideo ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                                Uploading...
                              </>
                            ) : (
                              <>
                                <FileVideo className="w-4 h-4 mr-2" />
                                Upload Video File
                              </>
                            )}
                          </Button>
                          <span className="text-sm text-muted-foreground">or</span>
                        </div>
                        
                        {/* URL Input Section */}
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
                      </div>
                      
                      <FormDescription>
                        Upload a video file (mp4, webm, etc.) or provide a direct link/YouTube/Vimeo URL
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
                  onClick={() => setLocation("/admin/practices")}
                  data-testid="button-cancel-create"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createPracticeMutation.isPending}
                  data-testid="button-create-practice"
                >
                  {createPracticeMutation.isPending ? "Creating..." : "Create Practice"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}