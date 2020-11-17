import React, { Component } from 'react';

export class IDPRootErrorBoundary extends Component<{}, { hasError: boolean }> {
  public static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  public render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return <h2>Something went wrong.</h2>;
    }
    return this.props.children;
  }
}

export default IDPRootErrorBoundary;
