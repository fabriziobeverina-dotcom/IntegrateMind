import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/pages/Dashboard";
import Landing from "@/pages/Landing";
import Practices from "@/pages/Practices";
import CreatePractice from "@/pages/CreatePractice";
import EditPractice from "@/pages/EditPractice";
import CreateReading from "@/pages/CreateReading";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminPractices from "@/pages/AdminPractices";
import AdminReadings from "@/pages/AdminReadings";
import NotFound from "@/pages/not-found";

function AuthenticatedRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/journal" component={() => <div className="p-8"><h1 className="text-2xl font-bold">Journal</h1><p className="text-muted-foreground">Full journal interface coming soon...</p></div>} />
      <Route path="/practices" component={Practices} />
      <Route path="/practices/create" component={CreatePractice} />
      <Route path="/practices/edit/:id" component={EditPractice} />
      <Route path="/readings" component={() => <div className="p-8"><h1 className="text-2xl font-bold">Reading Library</h1><p className="text-muted-foreground">Reading library coming soon...</p></div>} />
      <Route path="/readings/create" component={CreateReading} />
      <Route path="/videos" component={() => <div className="p-8"><h1 className="text-2xl font-bold">Video Library</h1><p className="text-muted-foreground">Video library coming soon...</p></div>} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/practices" component={AdminPractices} />
      <Route path="/admin/readings" component={AdminReadings} />
      <Route path="/admin/videos" component={() => <div className="p-8"><h1 className="text-2xl font-bold">Manage Videos</h1><p className="text-muted-foreground">Video management interface coming soon...</p></div>} />
      <Route path="/community" component={() => <div className="p-8"><h1 className="text-2xl font-bold">Community</h1><p className="text-muted-foreground">Full community features coming soon...</p></div>} />
      <Route path="/progress" component={() => <div className="p-8"><h1 className="text-2xl font-bold">Progress</h1><p className="text-muted-foreground">Detailed progress tracking coming soon...</p></div>} />
      <Route path="/profile" component={() => <div className="p-8"><h1 className="text-2xl font-bold">Profile</h1><p className="text-muted-foreground">User profile settings coming soon...</p></div>} />
      <Route path="/settings" component={() => <div className="p-8"><h1 className="text-2xl font-bold">Settings</h1><p className="text-muted-foreground">App settings coming soon...</p></div>} />
      <Route component={NotFound} />
    </Switch>
  );
}

function PublicRouter() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route component={Landing} />
    </Switch>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading, user } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <ThemeProvider>
        <PublicRouter />
      </ThemeProvider>
    );
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <ThemeProvider>
      <SidebarProvider style={style as React.CSSProperties}>
        <div className="flex h-screen w-full">
          <AppSidebar />
          <div className="flex flex-col flex-1">
            <header className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Welcome back, {(user as any)?.firstName || (user as any)?.email || 'User'}
                </div>
                <button
                  onClick={() => window.location.href = '/api/logout'}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-logout"
                >
                  Logout
                </button>
              </div>
            </header>
            <main className="flex-1 overflow-auto">
              <div className="container mx-auto p-6 max-w-7xl">
                <AuthenticatedRouter />
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;