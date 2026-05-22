import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8 bg-background text-foreground">
          <span className="text-5xl select-none">😵</span>
          <h1 className="text-xl font-semibold">页面出错了</h1>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            {this.state.error?.message ?? '未知错误'}
          </p>
          <button
            onClick={this.handleReset}
            className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 transition-opacity"
          >
            重新加载
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
