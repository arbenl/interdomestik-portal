import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class PanelBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

static getDerivedStateFromError() {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border rounded bg-red-50 text-red-700">
          <h3 className="font-bold">Something went wrong</h3>
          <p>This panel could not be loaded.</p>
          <Button onClick={this.handleRetry} className="mt-2">
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default PanelBoundary;
