import React, { Component, ReactNode } from "react";

interface Props {
  children?: ReactNode;
  resetKey?: any;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidUpdate(prevProps: Props) {
    if (this.props.resetKey !== prevProps.resetKey) {
      this.setState({ hasError: false, error: undefined });
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center p-8 bg-background text-foreground">
          <h2 className="text-2xl font-bold uppercase tracking-tighter text-destructive mb-2">System Failure</h2>
          <p className="font-mono text-muted-foreground mb-6 text-sm">{this.state.error?.message || "Unknown error"}</p>
          <button 
            className="px-6 py-2 bg-primary text-primary-foreground font-bold uppercase tracking-wider text-sm rounded-sm"
            onClick={() => this.setState({ hasError: false })}
          >
            Reboot Interface
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
