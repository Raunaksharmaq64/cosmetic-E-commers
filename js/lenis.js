/* ==========================================
   VELORÉ — Lenis Smooth Scroll
   ========================================== */

const SmoothScroll = (() => {
    let lenisInstance = null;

    function init() {
        lenisInstance = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            orientation: 'vertical',
            smoothWheel: true,
        });

        /* Sync Lenis with GSAP ticker */
        lenisInstance.on('scroll', ScrollTrigger.update);

        gsap.ticker.add((time) => {
            lenisInstance.raf(time * 1000);
        });

        gsap.ticker.lagSmoothing(0);
    }

    function getLenis() {
        return lenisInstance;
    }

    return { init, getLenis };
})();
