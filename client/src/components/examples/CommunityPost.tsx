import { CommunityPost } from '../CommunityPost';

export default function CommunityPostExample() {
  const mockPost = {
    id: '1',
    author: {
      name: 'Maya Rodriguez',
      initials: 'MR',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=32&h=32&fit=crop&crop=face'
    },
    content: 'Had a powerful breakthrough during my meditation practice today. The anxiety I\'ve been carrying finally felt like it was releasing from my chest. Anyone else experiencing shifts in how they hold emotions in their body?',
    tags: ['breakthrough', 'meditation', 'anxiety', 'bodywork'],
    likes: 12,
    comments: 5,
    timeAgo: '2h ago',
    isLiked: false
  };

  return (
    <CommunityPost
      post={mockPost}
      onLike={(id) => console.log('Liked post:', id)}
      onComment={(id, comment) => console.log('Comment on', id, ':', comment)}
      onShare={(id) => console.log('Shared post:', id)}
    />
  );
}