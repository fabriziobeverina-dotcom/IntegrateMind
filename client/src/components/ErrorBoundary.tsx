import { Component, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="p-6 max-w-md w-full space-y-4">
            <h2 className="text-xl font-bold text-destructive">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">
              The application encountered an error. Please try refreshing the page.
            </p>
            {this.state.error && (
              <div className="text-xs bg-muted p-3 rounded space-y-1">
                <p className="font-semibold text-destructive">{this.state.error.toString()}</p>
              </div>
            )}
            <Button
              onClick={() => window.location.href = '/'}
              className="w-full"
              data-testid="button-reload"
            >
              Reload Application
            </Button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
