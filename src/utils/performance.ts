/**
 * Performance monitoring and optimization utilities
 */

// Core Web Vitals monitoring
export const measureWebVitals = () => {
  // Only run in production and if the API is available
  if (process.env.NODE_ENV === 'production' && 'web-vitals' in window) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(console.log);
      getFID(console.log);
      getFCP(console.log);
      getLCP(console.log);
      getTTFB(console.log);
    });
  }
};

// Preload critical resources
export const preloadCriticalResources = () => {
  // Preload the most commonly used icons
  const link = document.createElement('link');
  link.rel = 'modulepreload';
  link.href = '/src/components/icons/index.ts';
  document.head.appendChild(link);

  // Preload critical CSS
  const cssLink = document.createElement('link');
  cssLink.rel = 'preload';
  cssLink.href = '/src/index.css';
  cssLink.as = 'style';
  document.head.appendChild(cssLink);
};

// Resource cleanup for better memory management
export const cleanupResources = () => {
  // Clean up event listeners that might cause memory leaks
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        if (registration.scope.includes('lovable')) {
          // Clean up any leftover service workers
          registration.unregister();
        }
      });
    });
  }
};

// Image optimization helper
export const optimizeImage = (file: File, maxWidth = 800, maxHeight = 600, quality = 0.8): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;
      
      // Use image rendering optimization
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to optimized format
      const format = file.type.includes('png') ? 'image/png' : 'image/jpeg';
      const compressedData = canvas.toDataURL(format, quality);
      
      resolve(compressedData);
    };

    img.src = URL.createObjectURL(file);
  });
};

// Debounce helper for performance optimization
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle helper for scroll events
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Memory usage monitoring
export const checkMemoryUsage = () => {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    console.log({
      usedJSHeapSize: `${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
      totalJSHeapSize: `${(memory.totalJSHeapSize / 1048576).toFixed(2)} MB`,
      jsHeapSizeLimit: `${(memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`
    });
  }
};

// Connection quality detection
export const getConnectionQuality = (): 'slow' | 'fast' | 'unknown' => {
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    if (connection.effectiveType) {
      return ['slow-2g', '2g', '3g'].includes(connection.effectiveType) ? 'slow' : 'fast';
    }
  }
  return 'unknown';
};