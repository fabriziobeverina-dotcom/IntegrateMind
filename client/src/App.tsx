import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppSidebar } from "@/components/AppSidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/pages/Dashboard";
import Landing from "@/pages/Landing";
import Practices from "@/pages/Practices";
import CreatePractice from "@/pages/CreatePractice";
import EditPractice from "@/pages/EditPractice";
import Readings from "@/pages/Readings";
import ReadingDetail from "@/pages/ReadingDetail";
import CreateReading from "@/pages/CreateReading";
import EditReading from "@/pages/EditReading";
import Videos from "@/pages/Videos";
import CreateVideo from "@/pages/CreateVideo";
import Journal from "@/pages/Journal";
import Progress from "@/pages/Progress";
import Settings from "@/pages/Settings";
import Profile from "@/pages/Profile";
import Community from "@/pages/Community";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminPractices from "@/pages/AdminPractices";
import AdminReadings from "@/pages/AdminReadings";
import AdminVideos from "@/pages/AdminVideos";
import AdminAnalytics from "@/pages/AdminAnalytics";
import AdminUsers from "@/pages/AdminUsers";
import AdminWellbeing from "@/pages/AdminWellbeing";
import TheReturn from "@/pages/TheReturn";
import NotFound from "@/pages/not-found";
import InstallGuide from "@/pages/InstallGuide";
import { NotificationScheduler } from "@/components/NotificationScheduler";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { CeremonyOnboarding } from "@/components/CeremonyOnboarding";
import { PushPermissionScreen } from "@/components/PushPermissionScreen";
import { FacilitatorConsentScreen } from "@/components/FacilitatorConsentScreen";
import { InstallPrompt } from "@/components/InstallPrompt";
import { SeedsAwardOverlay, BadgeUnlockOverlay } from "@/components/SeedsAward";
import { PhaseTransitionInterstitial } from "@/components/PhaseIndicator";
import { isPushSupported } from "@/lib/push";

function AuthenticatedRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/journal" component={Journal} />
      <Route path="/practices" component={Practices} />
      <Route path="/practices/create" component={CreatePractice} />
      <Route path="/practices/edit/:id" component={EditPractice} />
      <Route path="/readings" component={Readings} />
      <Route path="/readings/create" component={CreateReading} />
      <Route path="/readings/edit/:id" component={EditReading} />
      <Route path="/readings/:id" component={ReadingDetail} />
      <Route path="/videos" component={Videos} />
      <Route path="/videos/create" component={CreateVideo} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/practices" component={AdminPractices} />
      <Route path="/admin/readings" component={AdminReadings} />
      <Route path="/admin/videos" component={AdminVideos} />
      <Route path="/admin/analytics" component={AdminAnalytics} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/wellbeing" component={AdminWellbeing} />
      <Route path="/community" component={Community} />
      <Route path="/progress" component={Progress} />
      <Route path="/profile" component={Profile} />
      <Route path="/settings" component={Settings} />
      <Route path="/the-return" component={TheReturn} />
      <Route path="/install" component={InstallGuide} />
      <Route component={NotFound} />
    </Switch>
  );
}

function PublicRouter() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/install" component={InstallGuide} />
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

  const style: any = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const showOnboarding = !(user as any)?.onboardingComplete;
  const showCeremonyOnboarding = (user as any)?.onboardingComplete && !(user as any)?.onboardingCeremonyComplete;
  const showPushPermission =
    (user as any)?.onboardingComplete &&
    (user as any)?.onboardingCeremonyComplete &&
    !(user as any)?.pushPermissionAsked &&
    isPushSupported();
  const showConsentScreen =
    (user as any)?.onboardingComplete &&
    (user as any)?.onboardingCeremonyComplete &&
    ((user as any)?.pushPermissionAsked || !isPushSupported()) &&
    (user as any)?.facilitatorConsent === null;

  return (
    <ThemeProvider>
      <SidebarProvider style={style}>
        <div className="flex h-screen w-full overflow-hidden">
          <AppSidebar />
          <div className="flex flex-col flex-1 min-w-0">
            <header className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="hidden sm:block text-sm text-muted-foreground">
                  Welcome back, {(user as any)?.firstName || (user as any)?.email || 'User'}
                </div>
                <button
                  onClick={() => window.location.href = '/api/logout'}
                  className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-logout"
                >
                  Logout
                </button>
              </div>
            </header>
            <main className="flex-1 overflow-x-hidden overflow-y-auto relative">
              <div className="w-full max-w-7xl mx-auto px-4 py-4 sm:px-6 sm:py-6">
                <AuthenticatedRouter />
              </div>
            </main>
            <NotificationScheduler />
          </div>
        </div>
        {showOnboarding && <OnboardingFlow />}
        {showCeremonyOnboarding && <CeremonyOnboarding />}
        {!showOnboarding && !showCeremonyOnboarding && showPushPermission && (
          <PushPermissionScreen onDone={() => {}} />
        )}
        {!showOnboarding && !showCeremonyOnboarding && !showPushPermission && showConsentScreen && (
          <FacilitatorConsentScreen />
        )}
        {!showOnboarding && !showCeremonyOnboarding && !showPushPermission && !showConsentScreen && <PhaseTransitionInterstitial />}
        <InstallPrompt />
      </SidebarProvider>
    </ThemeProvider>
  );
}

function App() {
  console.log('✅ App loaded - Mobile responsive layout active');
  
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider skipDelayDuration={0} delayDuration={0}>
          <AppContent />
          <Toaster />
          <SeedsAwardOverlay />
          <BadgeUnlockOverlay />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
