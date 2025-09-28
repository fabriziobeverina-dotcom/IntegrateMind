import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Share, MoreHorizontal } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface Post {
  id: string;
  author: {
    name: string;
    avatar?: string;
    initials: string;
  };
  content: string;
  tags: string[];
  likes: number;
  comments: number;
  timeAgo: string;
  isLiked?: boolean;
}

interface CommunityPostProps {
  post: Post;
  onLike?: (postId: string) => void;
  onComment?: (postId: string, comment: string) => void;
  onShare?: (postId: string) => void;
}

export function CommunityPost({ post, onLike, onComment, onShare }: CommunityPostProps) {
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [localLikes, setLocalLikes] = useState(post.likes);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLocalLikes(prev => isLiked ? prev - 1 : prev + 1);
    onLike?.(post.id);
    console.log(`${isLiked ? 'Unliked' : 'Liked'} post:`, post.id);
  };

  const handleComment = () => {
    if (commentText.trim()) {
      onComment?.(post.id, commentText);
      setCommentText("");
      setShowComments(false);
      console.log('Posted comment:', commentText);
    }
  };

  const handleShare = () => {
    onShare?.(post.id);
    console.log('Shared post:', post.id);
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={post.author.avatar} alt={post.author.name} />
            <AvatarFallback>{post.author.initials}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm" data-testid={`text-author-${post.id}`}>
                {post.author.name}
              </h4>
              <span className="text-xs text-muted-foreground" data-testid={`text-time-${post.id}`}>
                {post.timeAgo}
              </span>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        <p className="text-sm leading-relaxed font-serif" data-testid={`text-content-${post.id}`}>
          {post.content}
        </p>
        
        {post.tags.length > 0 && (
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

      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className={`flex items-center gap-2 ${isLiked ? 'text-red-500' : 'text-muted-foreground'}`}
            data-testid={`button-like-${post.id}`}
          >
            <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
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
            <span className="text-xs">{post.comments}</span>
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
      </div>

      {showComments && (
        <div className="space-y-3 pt-3 border-t border-border">
          <div className="space-y-2">
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
                disabled={!commentText.trim()}
                data-testid={`button-post-comment-${post.id}`}
              >
                Post
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}