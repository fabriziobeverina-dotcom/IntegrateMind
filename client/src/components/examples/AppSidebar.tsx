import { AppSidebar } from '../AppSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ThemeProvider } from '../ThemeProvider';

export default function AppSidebarExample() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <ThemeProvider>
      <SidebarProvider style={style as React.CSSProperties}>
        <div className="flex h-screen w-full">
          <AppSidebar />
          <div className="flex-1 p-8 bg-background">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold mb-4">Dashboard Content</h2>
              <p className="text-muted-foreground">
                This is where the main content would appear. The sidebar navigation 
                allows users to switch between different sections of the Integration Compass app.
              </p>
            </div>
          </div>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}