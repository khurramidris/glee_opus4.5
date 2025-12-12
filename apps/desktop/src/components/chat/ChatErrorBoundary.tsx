import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Button } from '@/components/ui/Button';

interface Props {
  children: ReactNode;
  conversationId: string;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorType: 'llm' | 'render' | 'unknown';
}

export class ChatErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorType: 'unknown' };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorType = detectErrorType(error);
    return { hasError: true, error, errorType };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ChatErrorBoundary] Error:', error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.conversationId !== this.props.conversationId && this.state.hasError) {
      this.setState({ hasError: false, error: null, errorType: 'unknown' });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorType: 'unknown' });
    this.props.onRetry?.();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { error, errorType } = this.state;
    const errorMessages: Record<string, { title: string; description: string }> = {
      llm: {
        title: 'AI Generation Error',
        description: 'The AI model encountered an error while generating a response. This could be due to the model being overloaded or a temporary issue.',
      },
      render: {
        title: 'Display Error',
        description: 'There was a problem displaying the chat messages. Try refreshing or switching conversations.',
      },
      unknown: {
        title: 'Something went wrong',
        description: error?.message || 'An unexpected error occurred in the chat.',
      },
    };

    const msg = errorMessages[errorType];

    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-12 h-12 mb-4 text-red-500">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-surface-900 mb-2">{msg.title}</h3>
        <p className="text-sm text-surface-500 mb-4 max-w-sm">{msg.description}</p>
        
        {import.meta.env.DEV && error && (
          <pre className="mb-4 p-3 bg-surface-100 rounded text-xs text-left text-surface-600 max-w-md overflow-auto max-h-24">
            {error.stack?.slice(0, 500)}
          </pre>
        )}
        
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={this.handleRetry}>
            Try Again
          </Button>
          <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
            Reload Page
          </Button>
        </div>
      </div>
    );
  }
}

function detectErrorType(error: Error): 'llm' | 'render' | 'unknown' {
  const msg = error.message.toLowerCase();
  if (msg.includes('generation') || msg.includes('llm') || msg.includes('model') || msg.includes('sidecar')) {
    return 'llm';
  }
  if (msg.includes('render') || msg.includes('react') || msg.includes('component')) {
    return 'render';
  }
  return 'unknown';
}
