import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Initialize performance monitoring and optimizations
const initPerformance = async () => {
  const { measureWebVitals, preloadCriticalResources } = await import('./utils/performance');
  
  // Preload critical resources
  preloadCriticalResources();
  
  // Start monitoring web vitals
  measureWebVitals();

  // Register service worker for caching
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    });
  }
};

// Initialize performance optimizations
initPerformance();

createRoot(document.getElementById("root")!).render(<App />);
