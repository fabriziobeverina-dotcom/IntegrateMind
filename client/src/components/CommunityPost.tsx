import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Heart, MessageCircle, Share } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { UserAvatar } from "@/components/UserAvatar";

interface PostAuthor {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatar?: string | null;
  profileImageUrl?: string | null;
}

interface Post {
  id: string;
  author?: PostAuthor | null;
  content: string;
  tags?: string[];
  likes: number;
  commentCount?: number;
  comments?: number;
  createdAt?: string;
  timeAgo?: string;
  isLiked?: boolean;
  isAnonymous?: boolean;
}

interface CommunityPostProps {
  post: Post;
  onLike?: (postId: string) => void;
  onShare?: (postId: string) => void;
}

function getDisplayName(author?: PostAuthor | null, isAnonymous?: boolean): string {
  if (isAnonymous) return "Anonymous Member";
  if (!author) return "Community Member";
  if (author.firstName && author.lastName) return `${author.firstName} ${author.lastName}`;
  if (author.name && author.name.trim()) return author.name;
  return "Community Member";
}

function getInitials(author?: PostAuthor | null, isAnonymous?: boolean): string {
  if (isAnonymous) return "CM";
  if (!author) return "CM";
  if (author.firstName && author.lastName) {
    return `${author.firstName[0]}${author.lastName[0]}`.toUpperCase();
  }
  if (author.name && author.name.trim()) {
    const parts = author.name.trim().split(/\s+/);
    return parts.length > 1
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : author.name.substring(0, 2).toUpperCase();
  }
  return "CM";
}

export function CommunityPost({ post, onLike, onShare }: CommunityPostProps) {
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [localLikes, setLocalLikes] = useState(post.likes);
  const { toast } = useToast();

  const commentCount = post.commentCount ?? post.comments ?? 0;
  const timeAgo = post.timeAgo ?? (post.createdAt
    ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })
    : "");

  const createCommentMutation = useMutation({
    mutationFn: async ({ content }: { content: string }) => {
      return await apiRequest("POST", `/api/community/posts/${post.id}/comments`, {
        content,
        isAnonymous: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts"] });
      setCommentText("");
      setShowComments(false);
      toast({ title: "Comment posted", description: "Your comment has been shared." });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to post comment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLocalLikes((prev) => (isLiked ? prev - 1 : prev + 1));
    onLike?.(post.id);
  };

  const handleComment = () => {
    if (commentText.trim() && !createCommentMutation.isPending) {
      createCommentMutation.mutate({ content: commentText.trim() });
    }
  };

  const handleShare = () => {
    onShare?.(post.id);
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <UserAvatar
            avatarKey={post.author?.avatar ?? undefined}
            profileImageUrl={post.author?.profileImageUrl ?? undefined}
            name={getDisplayName(post.author, post.isAnonymous)}
            initials={getInitials(post.author, post.isAnonymous)}
          />
          <div className="space-y-0.5">
            <h4 className="font-semibold text-sm" data-testid={`text-author-${post.id}`}>
              {getDisplayName(post.author, post.isAnonymous)}
            </h4>
            <span className="text-xs text-muted-foreground" data-testid={`text-time-${post.id}`}>
              {timeAgo}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm leading-relaxed font-serif" data-testid={`text-content-${post.id}`}>
          {post.content}
        </p>

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-xs"
                data-testid={`tag-${tag}-${post.id}`}
              >
                #{tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 pt-3 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLike}
          className={`flex items-center gap-2 ${isLiked ? "text-red-500" : "text-muted-foreground"}`}
          data-testid={`button-like-${post.id}`}
        >
          <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
          <span className="text-xs">{localLikes}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-2 text-muted-foreground"
          data-testid={`button-comment-${post.id}`}
        >
          <MessageCircle className="h-4 w-4" />
          <span className="text-xs">{commentCount}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleShare}
          className="flex items-center gap-2 text-muted-foreground"
          data-testid={`button-share-${post.id}`}
        >
          <Share className="h-4 w-4" />
        </Button>
      </div>

      {showComments && (
        <div className="space-y-3 pt-3 border-t border-border">
          <Textarea
            placeholder="Share your thoughts or support..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="min-h-[80px] resize-none text-sm"
            data-testid={`input-comment-${post.id}`}
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowComments(false)}
              data-testid={`button-cancel-comment-${post.id}`}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleComment}
              disabled={!commentText.trim() || createCommentMutation.isPending}
              data-testid={`button-post-comment-${post.id}`}
            >
              {createCommentMutation.isPending ? "Posting..." : "Post"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
