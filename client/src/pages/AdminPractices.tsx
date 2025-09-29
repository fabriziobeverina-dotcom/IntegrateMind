import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { PlusIcon, EditIcon, TrashIcon, SearchIcon, ActivityIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';

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
  isFeatured: boolean;
  tags: string[];
  createdAt: string;
  createdByAdminId: string;
}

export default function AdminPractices() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  const isAdmin = (user as any)?.isAdmin;

  const { data: practices = [], isLoading } = useQuery({
    queryKey: ['/api/admin/practices'],
    enabled: isAdmin,
  }) as { data: Practice[], isLoading: boolean };

  const deletePracticeMutation = useMutation({
    mutationFn: (practiceId: string) => 
      fetch(`/api/admin/practices/${practiceId}`, {
        method: 'DELETE',
        credentials: 'include',
      }).then(res => {
        if (!res.ok) throw new Error('Failed to delete practice');
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/practices'] });
      toast({
        title: 'Practice deleted',
        description: 'The practice has been successfully deleted.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete practice',
        variant: 'destructive',
      });
    },
  });

  if (!isAdmin) {
    return (
      <div className="p-8">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to manage practices.</p>
          <Link href="/admin">
            <Button className="mt-4">Return to Admin Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Filter practices based on search and category
  const filteredPractices = practices.filter((practice) => {
    const matchesSearch = practice.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         practice.instructor.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         practice.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || practice.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...Array.from(new Set(practices.map(p => p.category)))];

  const handleDeletePractice = (practiceId: string) => {
    deletePracticeMutation.mutate(practiceId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading practices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-admin-practices-title">
            Manage Practices
          </h1>
          <p className="text-muted-foreground">
            Create, edit, and organize meditation and wellness practices
          </p>
        </div>
        <Link href="/practices/create">
          <Button data-testid="button-create-practice">
            <PlusIcon className="h-4 w-4 mr-2" />
            Add New Practice
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search practices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-practices"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-category-filter">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Total Practices</p>
                <p className="text-2xl font-bold" data-testid="text-total-practices">{practices.length}</p>
              </div>
              <ActivityIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Premium Practices</p>
                <p className="text-2xl font-bold" data-testid="text-premium-practices">
                  {practices.filter(p => p.isPremium).length}
                </p>
              </div>
              <Badge variant="secondary" className="text-xs">Premium</Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Featured Practices</p>
                <p className="text-2xl font-bold" data-testid="text-featured-practices">
                  {practices.filter(p => p.isFeatured).length}
                </p>
              </div>
              <Badge variant="outline" className="text-xs">Featured</Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Categories</p>
                <p className="text-2xl font-bold" data-testid="text-categories-count">
                  {categories.length - 1}
                </p>
              </div>
              <div className="text-xs text-muted-foreground">Unique</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Practices Grid */}
      {filteredPractices.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ActivityIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No practices found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || categoryFilter !== 'all' 
                ? 'No practices match your current filters.'
                : 'Get started by creating your first practice.'
              }
            </p>
            {!searchQuery && categoryFilter === 'all' && (
              <Link href="/practices/create">
                <Button>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Practice
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPractices.map((practice) => (
            <Card key={practice.id} className="hover-elevate" data-testid={`card-practice-${practice.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate" title={practice.title}>
                      {practice.title}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {practice.instructor} • {practice.duration}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1 ml-2">
                    {practice.isPremium && <Badge variant="secondary" className="text-xs">Premium</Badge>}
                    {practice.isFeatured && <Badge variant="outline" className="text-xs">Featured</Badge>}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0 space-y-4">
                <div>
                  <Badge variant="outline" className="mb-2">{practice.category}</Badge>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {practice.description}
                  </p>
                </div>
                
                {practice.tags && practice.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {practice.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {practice.tags.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{practice.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
                
                <div className="flex items-center gap-2 pt-2">
                  <Link href={`/practices/edit/${practice.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full" data-testid={`button-edit-${practice.id}`}>
                      <EditIcon className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </Link>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-destructive hover:text-destructive"
                        data-testid={`button-delete-${practice.id}`}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Practice</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{practice.title}"? This action cannot be undone 
                          and will also remove any user completion records.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeletePractice(practice.id)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}