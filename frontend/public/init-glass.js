// Initialize liquid glass effects after page load
document.addEventListener("DOMContentLoaded", () => {
  // Wait for liquidGL to be available
  if (typeof liquidGL === 'undefined') {
    console.warn('liquidGL not loaded yet, retrying...');
    setTimeout(() => location.reload(), 1000);
    return;
  }

  // Apply glass effect to market cards
  setTimeout(() => {
    try {
      liquidGL({
        target: ".glass-card",
        snapshot: "body",
        resolution: 2.0,
        refraction: 0.015,
        bevelDepth: 0.1,
        bevelWidth: 0.2,
        frost: 2,
        shadow: true,
        specular: true,
        reveal: "fade",
        magnify: 1.02
      });

      // Apply to header
      liquidGL({
        target: ".glass-header",
        snapshot: "body",
        resolution: 1.5,
        refraction: 0.01,
        bevelDepth: 0.05,
        bevelWidth: 0.15,
        frost: 1,
        shadow: false,
        specular: true,
        reveal: "slide",
        magnify: 1
      });

      console.log('✨ Liquid glass effects initialized');
    } catch (err) {
      console.error('Failed to initialize glass effects:', err);
    }
  }, 500);
});
