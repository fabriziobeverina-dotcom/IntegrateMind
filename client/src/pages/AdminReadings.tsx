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
import { PlusIcon, EditIcon, TrashIcon, SearchIcon, BookOpenIcon, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';

interface Reading {
  id: string;
  title: string;
  description: string;
  content?: string;
  link?: string;
  author?: string;
  category: string;
  readTime?: string;
  tags: string[];
  isFeatured: boolean;
  isPremium: boolean;
  createdAt: string;
  createdByAdminId: string;
}

export default function AdminReadings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  const isAdmin = (user as any)?.isAdmin;

  const { data: readings = [], isLoading } = useQuery({
    queryKey: ['/api/admin/readings'],
    enabled: isAdmin,
  }) as { data: Reading[], isLoading: boolean };

  const deleteReadingMutation = useMutation({
    mutationFn: (readingId: string) => 
      fetch(`/api/admin/readings/${readingId}`, {
        method: 'DELETE',
        credentials: 'include',
      }).then(res => {
        if (!res.ok) throw new Error('Failed to delete reading');
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/readings'] });
      toast({
        title: 'Reading deleted',
        description: 'The reading has been successfully deleted.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete reading',
        variant: 'destructive',
      });
    },
  });

  if (!isAdmin) {
    return (
      <div className="p-8">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to manage readings.</p>
          <Link href="/admin">
            <Button className="mt-4">Return to Admin Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Filter readings based on search and category
  const filteredReadings = readings.filter((reading) => {
    const matchesSearch = reading.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (reading.author && reading.author.toLowerCase().includes(searchQuery.toLowerCase())) ||
                         reading.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || reading.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...Array.from(new Set(readings.map(r => r.category)))];

  const handleDeleteReading = (readingId: string) => {
    deleteReadingMutation.mutate(readingId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading readings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-admin-readings-title">
            Manage Readings
          </h1>
          <p className="text-lg text-muted-foreground">
            Create and manage educational reading materials
          </p>
        </div>
        <Link href="/readings/create">
          <Button data-testid="button-add-reading">
            <PlusIcon className="w-4 h-4 mr-2" />
            Add New Reading
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Readings</CardTitle>
            <BookOpenIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-readings">
              {readings.length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Featured Content</CardTitle>
            <BookOpenIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-featured-readings">
              {readings.filter(r => r.isFeatured).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Premium Content</CardTitle>
            <BookOpenIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-premium-readings">
              {readings.filter(r => r.isPremium).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <BookOpenIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-reading-categories">
              {categories.length - 1}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search readings by title, author, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-readings"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]" data-testid="select-category-filter">
                <SelectValue placeholder="Filter by category" />
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

      {/* Readings List */}
      <div className="space-y-4">
        {filteredReadings.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <BookOpenIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No readings found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || categoryFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Get started by creating your first reading.'}
              </p>
              <Link href="/readings/create">
                <Button data-testid="button-create-first-reading">
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Create Your First Reading
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          filteredReadings.map((reading) => (
            <Card key={reading.id} className="hover-elevate">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl" data-testid={`reading-title-${reading.id}`}>
                        {reading.title}
                      </CardTitle>
                      {reading.isFeatured && (
                        <Badge variant="secondary" data-testid={`badge-featured-${reading.id}`}>
                          Featured
                        </Badge>
                      )}
                      {reading.isPremium && (
                        <Badge variant="outline" data-testid={`badge-premium-${reading.id}`}>
                          Premium
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span data-testid={`reading-category-${reading.id}`}>
                        {reading.category}
                      </span>
                      {reading.author && (
                        <span data-testid={`reading-author-${reading.id}`}>
                          by {reading.author}
                        </span>
                      )}
                      {reading.readTime && (
                        <span className="flex items-center gap-1" data-testid={`reading-time-${reading.id}`}>
                          <Clock className="h-3 w-3" />
                          {reading.readTime}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/readings/edit/${reading.id}`}>
                      <Button 
                        variant="outline" 
                        size="sm"
                        data-testid={`button-edit-reading-${reading.id}`}
                      >
                        <EditIcon className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </Link>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          data-testid={`button-delete-reading-${reading.id}`}
                        >
                          <TrashIcon className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the reading
                            "{reading.title}" and remove it from the platform.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteReading(reading.id)}
                            data-testid={`confirm-delete-reading-${reading.id}`}
                          >
                            Delete Reading
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base" data-testid={`reading-description-${reading.id}`}>
                  {reading.description}
                </CardDescription>
                {reading.tags && reading.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {reading.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-3" data-testid={`reading-created-${reading.id}`}>
                  Created {new Date(reading.createdAt).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}