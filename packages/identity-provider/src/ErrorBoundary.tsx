import React, { Component } from 'react';

interface Props {
  children?: React.ReactNode
}
interface State { hasError: boolean }

export class IDPRootErrorBoundary extends Component<Props, State> {
  public static getDerivedStateFromError(error: Error): State {
    console.error('IDPRootErrorBoundary', error)
    // Update state so the next render will show the fallback UI.
    return { hasError: Boolean(error) };
  }
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }
  public render(): JSX.Element {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return <h2>Something went wrong.</h2>;
    }
    return <>{this.props.children}</>
  }
}

export default IDPRootErrorBoundary;
