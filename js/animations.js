/* ==========================================
   VELORÉ — Animation Engine
   GSAP ScrollTrigger + Canvas Frame Sequencing
   ========================================== */

const Animations = (() => {
    /* Canvas elements */
    const heroCanvas = document.getElementById('hero-canvas');
    const storyCanvas = document.getElementById('story-canvas');
    const heroCtx = heroCanvas ? heroCanvas.getContext('2d') : null;
    const storyCtx = storyCanvas ? storyCanvas.getContext('2d') : null;

    /* Frame storage */
    let heroFrames = [];
    let storyFrames = [];

    /* Current drawn index to avoid redundant draws */
    let currentHeroFrame = -1;
    let currentStoryFrame = -1;

    /* ---------- TEXT SPLITTER HELPER ---------- */
    function splitTextElements() {
        document.querySelectorAll('.split-text').forEach(el => {
            // Only split once
            if (el.classList.contains('splitted')) return;
            el.classList.add('splitted');
            
            let html = '';
            // Handle existing <br> tags by splitting text around them
            const nodes = Array.from(el.childNodes);
            nodes.forEach(node => {
                if (node.nodeType === 3) { // Text node
                    const words = node.textContent.split(' ').filter(w => w.trim() !== '');
                    words.forEach((word) => {
                        html += `<span class="split-line"><span class="split-word">${word}&nbsp;</span></span>`;
                    });
                } else if (node.tagName === 'BR') {
                    html += '<br>';
                } else if (node.nodeType === 1) { // Element node (like <em>)
                    const words = node.textContent.split(' ').filter(w => w.trim() !== '');
                    words.forEach((word) => {
                        html += `<span class="split-line"><span class="split-word"><${node.tagName.toLowerCase()}>${word}</${node.tagName.toLowerCase()}>&nbsp;</span></span>`;
                    });
                }
            });
            el.innerHTML = html;
        });
    }

    /* ---------- CANVAS RENDERING ---------- */

    function resizeCanvas(canvas) {
        if (!canvas) return;
        if (canvas.id === 'story-canvas') {
            const parent = canvas.parentElement;
            canvas.width = parent.clientWidth || window.innerWidth;
            canvas.height = parent.clientHeight || window.innerHeight;
        } else {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
    }

    function drawFrame(ctx, canvas, frames, index) {
        if (!ctx || !frames.length || index < 0 || index >= frames.length) return;
        const img = frames[index];
        if (!img || !img.complete) return;

        const cw = canvas.width;
        const ch = canvas.height;
        const iw = img.naturalWidth || img.width;
        const ih = img.naturalHeight || img.height;

        /* Cover the canvas while maintaining aspect ratio */
        const scale = Math.max(cw / iw, ch / ih);
        const dw = iw * scale;
        const dh = ih * scale;
        const dx = (cw - dw) / 2;
        const dy = (ch - dh) / 2;

        ctx.clearRect(0, 0, cw, ch);
        ctx.drawImage(img, dx, dy, dw, dh);
    }

    /* ---------- SET FRAMES (called by Preloader) ---------- */

    function setHeroFrames(images) {
        heroFrames = images.filter(Boolean);
        resizeCanvas(heroCanvas);
        if (heroFrames.length > 0) {
            drawFrame(heroCtx, heroCanvas, heroFrames, 0);
            currentHeroFrame = 0;
        }
        initScrollAnimations();
    }

    function setStoryFrames(images) {
        storyFrames = images.filter(Boolean);
        resizeCanvas(storyCanvas);
        if (storyFrames.length > 0) {
            drawFrame(storyCtx, storyCanvas, storyFrames, 0);
            currentStoryFrame = 0;
        }
        initStoryScroll();
    }

    /* ---------- GSAP SCROLL ANIMATIONS ---------- */

    let heroScrollSetup = false;
    let storyScrollSetup = false;

    function initScrollAnimations() {
        if (heroScrollSetup || heroFrames.length === 0) return;
        heroScrollSetup = true;

        gsap.registerPlugin(ScrollTrigger);

        /* Hero canvas frame scrubbing */
        const heroObj = { frame: 0 };

        gsap.to(heroObj, {
            frame: heroFrames.length - 1,
            snap: 'frame',
            ease: 'none',
            scrollTrigger: {
                trigger: '#hero',
                start: 'top top',
                end: 'bottom bottom',
                scrub: 0.5,
                onUpdate: () => {
                    const idx = Math.round(heroObj.frame);
                    if (idx !== currentHeroFrame) {
                        currentHeroFrame = idx;
                        requestAnimationFrame(() => {
                            drawFrame(heroCtx, heroCanvas, heroFrames, idx);
                        });
                    }
                }
            }
        });

        /* Navbar scroll behavior */
        ScrollTrigger.create({
            trigger: '#hero',
            start: '100px top',
            onEnter: () => document.getElementById('navbar').classList.add('scrolled'),
            onLeaveBack: () => document.getElementById('navbar').classList.remove('scrolled'),
        });

        /* Split text and prepare */
        splitTextElements();
        
        /* Image Parallax (Optimized) */
        gsap.utils.toArray('.cinematic-img-wrapper img, .product-img-wrapper img').forEach(img => {
            // Give img extra height so it can translate without showing empty space
            gsap.set(img, { height: "120%", yPercent: -10 });
            gsap.to(img, {
                yPercent: 10,
                ease: "none",
                scrollTrigger: {
                    trigger: img.parentElement,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: true
                }
            });
        });

        /* Text Reveals */
        gsap.utils.toArray('.split-text').forEach(el => {
            const words = el.querySelectorAll('.split-word');
            if (words.length > 0) {
                gsap.fromTo(words, 
                    { y: "100%", opacity: 0 },
                    {
                        y: "0%",
                        opacity: 1,
                        duration: 1,
                        ease: "power3.out",
                        stagger: 0.05,
                        scrollTrigger: {
                            trigger: el,
                            start: "top 85%",
                            toggleActions: "play none none reverse"
                        }
                    }
                );
            }
        });

        /* Philosophy section reveal */
        const philoSection = document.getElementById('philosophy');
        if (philoSection) {
            const philoTl = gsap.timeline({
                scrollTrigger: {
                    trigger: '#philosophy',
                    start: 'top 75%',
                    toggleActions: 'play none none reverse',
                }
            });

            philoTl.to('.philosophy-line', {
                opacity: 1,
                scaleX: 1,
                duration: 0.8,
                ease: 'power3.out',
                stagger: 0.6,
            }, 0);

            philoTl.to('.philosophy-label', {
                opacity: 1,
                duration: 0.6,
                ease: 'power3.out',
            }, 0.2);

            philoTl.to('.philosophy-title', {
                opacity: 1,
                duration: 0.8,
                ease: 'power3.out',
            }, 0.4); // Text reveal happens via split-text now, but opacity fade still works as fallback

            philoTl.to('.philosophy-body', {
                opacity: 1,
                duration: 0.8,
                ease: 'power3.out',
            }, 0.6);

            philoTl.to('.philosophy-stats', {
                opacity: 1,
                duration: 0.8,
                ease: 'power3.out',
            }, 0.8);
        }

        /* Cinematic panels reveal */
        gsap.utils.toArray('.cinematic-panel').forEach((panel) => {
            gsap.to(panel, {
                opacity: 1,
                y: 0,
                duration: 1,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: panel,
                    start: 'top 80%',
                    toggleActions: 'play none none reverse',
                }
            });
        });

        /* Product cards stagger reveal */
        gsap.utils.toArray('.product-card').forEach((card, i) => {
            gsap.fromTo(card, 
                {
                    opacity: 0,
                    y: 60,
                    rotateX: -20,
                    rotateY: 10,
                    transformPerspective: 1000
                },
                {
                    opacity: 1,
                    y: 0,
                    rotateX: 0,
                    rotateY: 0,
                    duration: 1,
                    delay: i * 0.15,
                    ease: 'power3.out',
                    scrollTrigger: {
                        trigger: card,
                        start: 'top 85%',
                        toggleActions: 'play none none reverse',
                    }
                }
            );
        });

        /* CTA reveal */
        const ctaTitle = document.querySelector('.cta-title');
        const ctaSub = document.querySelector('.cta-subtitle');
        const ctaBtn = document.querySelector('.magnetic-btn');

        if (ctaTitle) {
            gsap.to(ctaTitle, {
                opacity: 1,
                duration: 1,
                ease: 'power3.out',
                scrollTrigger: { trigger: '#cta', start: 'top 75%' }
            }); // Split text handles words, this ensures opacity is 1
        }
        if (ctaSub) {
            gsap.to(ctaSub, {
                opacity: 1,
                duration: 1,
                delay: 0.2,
                ease: 'power3.out',
                scrollTrigger: { trigger: '#cta', start: 'top 75%' }
            });
        }
        if (ctaBtn) {
            gsap.to(ctaBtn, {
                opacity: 1,
                duration: 1,
                delay: 0.4,
                ease: 'power3.out',
                scrollTrigger: { trigger: '#cta', start: 'top 75%' }
            });
        }
    }

    function initStoryScroll() {
        if (storyScrollSetup || storyFrames.length === 0) return;
        storyScrollSetup = true;

        /* Story canvas frame scrubbing */
        const storyObj = { frame: 0 };

        gsap.to(storyObj, {
            frame: storyFrames.length - 1,
            snap: 'frame',
            ease: 'none',
            scrollTrigger: {
                trigger: '.cinematic-panel-2',
                start: 'top bottom',
                end: 'bottom top',
                scrub: 1,
                onEnter: () => typeof Particles !== 'undefined' && Particles.start(),
                onLeave: () => typeof Particles !== 'undefined' && Particles.stop(),
                onEnterBack: () => typeof Particles !== 'undefined' && Particles.start(),
                onLeaveBack: () => typeof Particles !== 'undefined' && Particles.stop(),
                onUpdate: () => {
                    const idx = Math.round(storyObj.frame);
                    if (idx !== currentStoryFrame) {
                        currentStoryFrame = idx;
                        requestAnimationFrame(() => {
                            drawFrame(storyCtx, storyCanvas, storyFrames, idx);
                        });
                    }
                }
            }
        });

        /* Story text reveals based on scroll progress */
        const storyText1 = document.querySelector('.story-text-1');
        const storyText2 = document.querySelector('.story-text-2');

        if (storyText1) {
            gsap.fromTo(storyText1,
                { opacity: 0, y: 40 },
                {
                    opacity: 1, y: 0,
                    duration: 1,
                    ease: 'power3.out',
                    scrollTrigger: {
                        trigger: '#story',
                        start: '10% top',
                        end: '35% top',
                        scrub: true,
                    }
                }
            );
            /* Fade out */
            gsap.to(storyText1, {
                opacity: 0, y: -30,
                scrollTrigger: {
                    trigger: '#story',
                    start: '35% top',
                    end: '50% top',
                    scrub: true,
                }
            });
        }

        if (storyText2) {
            gsap.fromTo(storyText2,
                { opacity: 0, y: 40 },
                {
                    opacity: 1, y: 0,
                    duration: 1,
                    ease: 'power3.out',
                    scrollTrigger: {
                        trigger: '#story',
                        start: '50% top',
                        end: '70% top',
                        scrub: true,
                    }
                }
            );
            gsap.to(storyText2, {
                opacity: 0, y: -30,
                scrollTrigger: {
                    trigger: '#story',
                    start: '75% top',
                    end: '90% top',
                    scrub: true,
                }
            });
        }
    }

    /* ---------- HERO REVEAL (after preloader) ---------- */

    function initHeroReveal() {
        const brand = document.querySelector('.hero-brand');
        const words = document.querySelectorAll('.title-word');
        const subtitle = document.querySelector('.hero-subtitle');
        const scrollInd = document.getElementById('scroll-indicator');

        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        tl.to(brand, { opacity: 1, duration: 0.8 }, 0);

        words.forEach((word, i) => {
            tl.to(word, {
                opacity: 1,
                y: 0,
                duration: 1,
            }, 0.3 + i * 0.15);
        });

        tl.to(subtitle, { opacity: 1, duration: 0.8 }, 0.8);
        tl.to(scrollInd, { opacity: 1, duration: 0.6 }, 1.2);
    }

    /* ---------- RESIZE HANDLER ---------- */

    window.addEventListener('resize', () => {
        resizeCanvas(heroCanvas);
        resizeCanvas(storyCanvas);

        if (currentHeroFrame >= 0 && heroFrames.length) {
            drawFrame(heroCtx, heroCanvas, heroFrames, currentHeroFrame);
        }
        if (currentStoryFrame >= 0 && storyFrames.length) {
            drawFrame(storyCtx, storyCanvas, storyFrames, currentStoryFrame);
        }
    });

    return {
        setHeroFrames,
        setStoryFrames,
        initHeroReveal,
    };
})();
