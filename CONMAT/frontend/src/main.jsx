import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import GlobalErrorBoundary from './components/common/GlobalErrorBoundary';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/theme.css';
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </React.StrictMode>
);
