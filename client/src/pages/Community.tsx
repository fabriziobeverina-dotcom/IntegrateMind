import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Heart, 
  MessageCircle, 
  Send, 
  Users, 
  UserCircle,
  Loader2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Author {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
}

interface CommunityPost {
  id: string;
  userId: string;
  content: string;
  tags: string[];
  likes: number;
  isAnonymous: boolean;
  createdAt: string;
  author: Author;
  commentCount: number;
  isLiked?: boolean;
}

interface Comment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  isAnonymous: boolean;
  createdAt: string;
  author: Author;
}

export default function Community() {
  const [newPostContent, setNewPostContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [commentContent, setCommentContent] = useState("");
  const [commentAnonymous, setCommentAnonymous] = useState(false);
  const { toast } = useToast();

  // Fetch community posts
  const { data: posts = [], isLoading } = useQuery<CommunityPost[]>({
    queryKey: ['/api/community/posts'],
  });

  // Fetch comments for selected post
  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ['/api/community/posts', selectedPost, 'comments'],
    enabled: !!selectedPost,
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (data: { content: string; isAnonymous: boolean }) => {
      return await apiRequest('POST', '/api/community/posts', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/community/posts'] });
      setNewPostContent("");
      setIsAnonymous(false);
      toast({
        title: "Post created",
        description: "Your post has been shared with the community",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Like post mutation
  const likePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      return await apiRequest('POST', `/api/community/posts/${postId}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/community/posts'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to like post. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Unlike post mutation
  const unlikePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      return await apiRequest('DELETE', `/api/community/posts/${postId}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/community/posts'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to unlike post. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: async (data: { postId: string; content: string; isAnonymous: boolean }) => {
      return await apiRequest('POST', `/api/community/posts/${data.postId}/comments`, {
        content: data.content,
        isAnonymous: data.isAnonymous
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/community/posts', selectedPost, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/community/posts'] });
      setCommentContent("");
      setCommentAnonymous(false);
      toast({
        title: "Comment added",
        description: "Your comment has been posted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add comment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreatePost = () => {
    if (!newPostContent.trim()) {
      toast({
        title: "Error",
        description: "Please enter some content for your post",
        variant: "destructive",
      });
      return;
    }

    createPostMutation.mutate({
      content: newPostContent,
      isAnonymous,
    });
  };

  const handleToggleLike = (post: CommunityPost) => {
    if (post.isLiked) {
      unlikePostMutation.mutate(post.id);
    } else {
      likePostMutation.mutate(post.id);
    }
  };

  const handleCreateComment = (postId: string) => {
    if (!commentContent.trim()) {
      toast({
        title: "Error",
        description: "Please enter a comment",
        variant: "destructive",
      });
      return;
    }

    createCommentMutation.mutate({
      postId,
      content: commentContent,
      isAnonymous: commentAnonymous,
    });
  };

  const getDisplayName = (author: Author, isAnonymous: boolean) => {
    if (isAnonymous) return "Anonymous";
    if (author.firstName && author.lastName) {
      return `${author.firstName} ${author.lastName}`;
    }
    return author.name || "Community Member";
  };

  const getInitials = (author: Author, isAnonymous: boolean) => {
    if (isAnonymous) return "?";
    if (author.firstName && author.lastName) {
      return `${author.firstName[0]}${author.lastName[0]}`.toUpperCase();
    }
    if (author.name) {
      const parts = author.name.split(" ");
      return parts.length > 1 
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : author.name.substring(0, 2).toUpperCase();
    }
    return "CM";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="p-2 sm:p-3 rounded-lg bg-primary/10">
          <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-community-title">Community</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Share your journey and connect with others
          </p>
        </div>
      </div>

      {/* Create Post Card */}
      <Card data-testid="card-create-post">
        <CardHeader>
          <h2 className="text-lg font-semibold">Share with the Community</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Share your thoughts, insights, or questions..."
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            rows={4}
            data-testid="input-post-content"
          />
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <Switch
                id="post-anonymous"
                checked={isAnonymous}
                onCheckedChange={setIsAnonymous}
                data-testid="switch-post-anonymous"
              />
              <Label htmlFor="post-anonymous" className="text-xs sm:text-sm text-muted-foreground">
                Post anonymously
              </Label>
            </div>
            <Button
              onClick={handleCreatePost}
              disabled={createPostMutation.isPending || !newPostContent.trim()}
              data-testid="button-create-post"
              className="w-full sm:w-auto"
            >
              {createPostMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Post
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Posts Feed */}
      <div className="space-y-4">
        {posts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
              <p className="text-muted-foreground text-center">
                Be the first to share something with the community!
              </p>
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => (
            <Card key={post.id} data-testid={`card-post-${post.id}`}>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {post.isAnonymous ? <UserCircle className="h-5 w-5" /> : getInitials(post.author, post.isAnonymous)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold" data-testid={`text-post-author-${post.id}`}>
                        {getDisplayName(post.author, post.isAnonymous)}
                      </span>
                      {post.isAnonymous && (
                        <Badge variant="secondary" className="text-xs">Anonymous</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap" data-testid={`text-post-content-${post.id}`}>
                  {post.content}
                </p>
              </CardContent>
              <CardFooter className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleLike(post)}
                  className={post.isLiked ? "text-red-500" : ""}
                  data-testid={`button-like-${post.id}`}
                >
                  <Heart className={`h-4 w-4 mr-1 ${post.isLiked ? "fill-current" : ""}`} />
                  {post.likes}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPost(selectedPost === post.id ? null : post.id)}
                  data-testid={`button-comments-${post.id}`}
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  {post.commentCount}
                </Button>
              </CardFooter>

              {/* Comments Section */}
              {selectedPost === post.id && (
                <>
                  <Separator />
                  <CardContent className="pt-4 space-y-4">
                    {/* Comment Input */}
                    <div className="space-y-3">
                      <Textarea
                        placeholder="Write a comment..."
                        value={commentContent}
                        onChange={(e) => setCommentContent(e.target.value)}
                        rows={2}
                        data-testid={`input-comment-${post.id}`}
                      />
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={`comment-anonymous-${post.id}`}
                            checked={commentAnonymous}
                            onCheckedChange={setCommentAnonymous}
                            data-testid={`switch-comment-anonymous-${post.id}`}
                          />
                          <Label htmlFor={`comment-anonymous-${post.id}`} className="text-xs sm:text-sm text-muted-foreground">
                            Comment anonymously
                          </Label>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleCreateComment(post.id)}
                          disabled={createCommentMutation.isPending || !commentContent.trim()}
                          data-testid={`button-add-comment-${post.id}`}
                          className="w-full sm:w-auto"
                        >
                          {createCommentMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Comment"
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Comments List */}
                    {comments.length > 0 && (
                      <div className="space-y-3 mt-4">
                        {comments.map((comment) => (
                          <div key={comment.id} className="flex gap-3" data-testid={`comment-${comment.id}`}>
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {comment.isAnonymous ? <UserCircle className="h-4 w-4" /> : getInitials(comment.author, comment.isAnonymous)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm">
                                  {getDisplayName(comment.author, comment.isAnonymous)}
                                </span>
                                {comment.isAnonymous && (
                                  <Badge variant="secondary" className="text-xs">Anonymous</Badge>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                </span>
                              </div>
                              <p className="text-sm mt-1">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
