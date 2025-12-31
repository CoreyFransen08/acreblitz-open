import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Import the component library styles - this includes Leaflet CSS and all component styles
import '@acreblitz/react-components/styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
