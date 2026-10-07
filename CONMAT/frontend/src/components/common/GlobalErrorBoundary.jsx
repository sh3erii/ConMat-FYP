import { Component } from 'react';
import './GlobalErrorBoundary.css';

export default class GlobalErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error?.message || 'Something went wrong.' };
  }

  componentDidCatch(error, info) {
    console.error('ConMat UI Error:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <section className="global-error-boundary">
        <div className="global-error-card">
          <span>UI Error</span>
          <h2>Something went wrong</h2>
          <p>{this.state.errorMessage}</p>
          <button type="button" onClick={() => window.location.reload()}>Reload Page</button>
        </div>
      </section>
    );
  }
}
