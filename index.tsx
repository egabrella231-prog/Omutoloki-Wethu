
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error("Critical Application Failure:", error);
  rootElement.innerHTML = `
    <div style="padding: 40px; color: #f87171; background: #0f172a; min-height: 100vh; font-family: sans-serif;">
      <h1 style="font-size: 24px; font-weight: 800; margin-bottom: 16px;">CRITICAL SYSTEM ERROR</h1>
      <p style="color: #94a3b8; margin-bottom: 24px;">The neural link could not be established. This is likely due to a configuration error or missing environment variables.</p>
      <pre style="background: #020617; padding: 20px; border-radius: 12px; overflow: auto; border: 1px solid #1e293b; color: #ef4444;">${error instanceof Error ? error.message : String(error)}</pre>
      <button onclick="window.location.reload()" style="margin-top: 24px; background: #4f46e5; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: bold;">Retry Link Sequence</button>
    </div>
  `;
}
