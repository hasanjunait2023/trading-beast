import React from 'react';
import { ErrorState } from './ErrorState';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional context label shown in the fallback, e.g. the app name. */
  context?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Top-level error boundary (Z5): catches render/runtime errors anywhere
 * below it and renders the shared ErrorState with a reload action instead
 * of a blank screen. Wire once per app around the root component.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Keep the detail in the console for diagnosis; never render raw
    // stack traces (or anything they may contain) into the page.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private handleReload = () => {
    if (typeof window !== 'undefined') window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
          <ErrorState
            title={this.props.context ? `${this.props.context} hit a problem` : 'Something went wrong'}
            message="The page could not be displayed. Your account and credits are unaffected — reload to continue."
            onRetry={this.handleReload}
            retryLabel="Reload the app"
          />
        </div>
      );
    }
    return this.props.children;
  }
}
