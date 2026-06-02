import { useEffect } from 'react';
import { useLocation } from 'react-router';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

// Import custom styles
import '@/styles/nprogress.css';

// Configure NProgress
NProgress.configure({
  showSpinner: false,
  trickleSpeed: 200,
  minimum: 0.08,
  easing: 'ease',
  speed: 400,
});

export function RouteProgress() {
  const location = useLocation();

  useEffect(() => {
    console.log('RouteProgress: Route changed to', location.pathname);

    // Start progress bar
    NProgress.start();

    // Complete after a delay
    const timer = setTimeout(() => {
      NProgress.done();
      console.log('RouteProgress: Progress done');
    }, 500);

    return () => {
      clearTimeout(timer);
      NProgress.done();
    };
  }, [location.pathname]);

  // Test: Log when component mounts
  useEffect(() => {
    console.log('RouteProgress component mounted');
    return () => {
      console.log('RouteProgress component unmounted');
    };
  }, []);

  return null;
}
