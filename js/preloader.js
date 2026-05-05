/* ==========================================
   VELORÉ — Preloader
   Handles asset loading & branded intro
   ========================================== */

const Preloader = (() => {
    const preloader = document.getElementById('preloader');
    const progressBar = document.getElementById('preloader-progress');
    const percentText = document.getElementById('preloader-percent');
    const logoSpans = document.querySelectorAll('.preloader-logo span');

    let loadedCount = 0;
    let totalCount = 0;
    let isComplete = false;

    /* Animate logo letters in */
    function animateLogo() {
        logoSpans.forEach((span, i) => {
            setTimeout(() => {
                span.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                span.style.opacity = '1';
                span.style.transform = 'translateY(0)';
            }, i * 120);
        });
    }

    /* Update progress UI */
    function updateProgress() {
        if (totalCount === 0) return;
        const pct = Math.round((loadedCount / totalCount) * 100);
        progressBar.style.width = pct + '%';
        percentText.textContent = pct + '%';

        if (loadedCount >= totalCount && !isComplete) {
            isComplete = true;
            setTimeout(revealSite, 400); // Reduced from 800ms to 400ms
        }
    }

    /* Reveal site */
    function revealSite() {
        document.body.classList.remove('loading');
        preloader.classList.add('hidden');

        /* Trigger hero animations after preloader fades */
        setTimeout(() => {
            if (typeof Animations !== 'undefined' && Animations.initHeroReveal) {
                Animations.initHeroReveal();
            }
        }, 600);
    }

    /* Preload an array of image srcs, returns array of Image objects */
    function preloadImages(srcs) {
        totalCount += srcs.length;
        const images = new Array(srcs.length);

        return new Promise((resolve) => {
            if (srcs.length === 0) { resolve([]); return; }
            let done = 0;
            srcs.forEach((src, i) => {
                const img = new Image();
                img.onload = img.onerror = () => {
                    images[i] = img;
                    loadedCount++;
                    done++;
                    updateProgress();
                    if (done >= srcs.length) resolve(images);
                };
                img.src = src;
            });
        });
    }

    /* Build frame paths for a sequence */
    function buildFramePaths(folder, count, prefix = 'ezgif-frame-') {
        const paths = [];
        for (let i = 1; i <= count; i++) {
            const num = String(i).padStart(3, '0');
            paths.push(`${folder}/${prefix}${num}.png`);
        }
        return paths;
    }

    /* Initialize */
    function init() {
        document.body.classList.add('loading');
        animateLogo();

        /* Aggressive frame skipping for performance
           Desktop: every 3rd frame  → 80 hero + 50 story = 130 images (~100MB)
           Tablet:  every 4th frame  → 60 hero + 38 story = 98 images (~75MB)
           Mobile:  every 6th frame  → 40 hero + 25 story = 65 images (~50MB) */
        const isMobile = window.innerWidth <= 768;
        const isTablet = window.innerWidth <= 1024 && window.innerWidth > 768;

        let heroStep, storyStep;

        if (isMobile) {
            heroStep = 6;
            storyStep = 6;
        } else if (isTablet) {
            heroStep = 4;
            storyStep = 4;
        } else {
            heroStep = 3;
            storyStep = 3;
        }

        /* Build paths with frame skipping */
        const heroAllPaths = buildFramePaths('luminea botinual renual cream facepack', 240);
        const storyAllPaths = buildFramePaths('luminea hydrating serum', 150);

        const heroPaths = heroAllPaths.filter((_, i) => i % heroStep === 0);
        const storyPaths = storyAllPaths.filter((_, i) => i % storyStep === 0);

        /* Preload hero first, then story in background */
        preloadImages(heroPaths).then((heroImages) => {
            if (typeof Animations !== 'undefined') {
                Animations.setHeroFrames(heroImages);
            }
        });

        preloadImages(storyPaths).then((storyImages) => {
            if (typeof Animations !== 'undefined') {
                Animations.setStoryFrames(storyImages);
            }
        });
    }

    return { init };
})();

/* Start preloader */
Preloader.init();
