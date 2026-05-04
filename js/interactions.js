/* ==========================================
   VELORÉ — Micro-Interactions
   Cursor glow, magnetic buttons, hover effects
   ========================================== */

const Interactions = (() => {
    const cursorGlow = document.getElementById('cursor-glow');
    const cursorDot = document.getElementById('cursor-dot');
    const magneticBtn = document.getElementById('cta-btn');
    const navToggle = document.getElementById('nav-toggle');
    const navLinks = document.getElementById('nav-links');

    let mouseX = 0, mouseY = 0;
    let glowX = 0, glowY = 0;
    let dotX = 0, dotY = 0;
    let isDesktop = window.innerWidth > 768;

    /* ---------- CUSTOM CURSOR ---------- */

    function initCursor() {
        if (!isDesktop || !cursorGlow) return;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        /* Lerp the cursor for smooth follow */
        function animateCursor() {
            glowX += (mouseX - glowX) * 0.12;
            glowY += (mouseY - glowY) * 0.12;
            dotX += (mouseX - dotX) * 0.25;
            dotY += (mouseY - dotY) * 0.25;

            cursorGlow.style.left = glowX + 'px';
            cursorGlow.style.top = glowY + 'px';
            cursorDot.style.left = dotX + 'px';
            cursorDot.style.top = dotY + 'px';

            requestAnimationFrame(animateCursor);
        }

        animateCursor();

        /* Hover states */
        const hoverEls = document.querySelectorAll('a, button, .product-card');
        hoverEls.forEach((el) => {
            el.addEventListener('mouseenter', () => {
                cursorGlow.classList.add('hovering');
            });
            el.addEventListener('mouseleave', () => {
                cursorGlow.classList.remove('hovering');
            });
        });
    }

    /* ---------- MAGNETIC BUTTONS & LINKS ---------- */

    function initMagneticElements() {
        if (!isDesktop) return;
        
        const magneticElements = document.querySelectorAll('.magnetic-btn, .magnetic-link');

        magneticElements.forEach(btn => {
            btn.addEventListener('mousemove', (e) => {
                const rect = btn.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                
                const intensity = btn.classList.contains('magnetic-btn') ? 0.3 : 0.15;

                gsap.to(btn, {
                    x: x * intensity,
                    y: y * intensity,
                    duration: 0.4,
                    ease: 'power3.out',
                });

                /* Position the fill circle at cursor */
                const circle = btn.querySelector('.btn-circle');
                if (circle) {
                    circle.style.left = e.clientX - rect.left + 'px';
                    circle.style.top = e.clientY - rect.top + 'px';
                }
            });

            btn.addEventListener('mouseleave', () => {
                gsap.to(btn, {
                    x: 0,
                    y: 0,
                    duration: 0.6,
                    ease: 'elastic.out(1, 0.5)',
                });
            });
        });
    }

    /* ---------- 3D PRODUCT TILT ---------- */

    function initProductTilt() {
        if (!isDesktop) return;

        const cards = document.querySelectorAll('.product-card');
        
        cards.forEach(card => {
            const glare = card.querySelector('.product-glare');
            
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                // Increase tilt for parallax
                const rotateX = ((y - centerY) / centerY) * -12;
                const rotateY = ((x - centerX) / centerX) * 12;
                
                gsap.to(card, {
                    rotateX: rotateX,
                    rotateY: rotateY,
                    transformPerspective: 1200,
                    ease: 'power2.out',
                    duration: 0.4
                });
                
                // Animate Glare Position
                if (glare) {
                    const glareX = (x / rect.width) * 100;
                    const glareY = (y / rect.height) * 100;
                    glare.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.15) 0%, transparent 60%)`;
                }
            });
            
            card.addEventListener('mouseleave', () => {
                gsap.to(card, {
                    rotateX: 0,
                    rotateY: 0,
                    ease: 'power3.out',
                    duration: 0.8
                });
                
                if (glare) {
                    glare.style.background = `radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 60%)`;
                }
            });
        });
    }

    /* ---------- MOBILE NAV TOGGLE ---------- */

    function initNavToggle() {
        if (!navToggle || !navLinks) return;

        navToggle.addEventListener('click', () => {
            const isOpen = navLinks.classList.toggle('open');
            navToggle.classList.toggle('active');
            navToggle.setAttribute('aria-expanded', isOpen);
        });

        /* Close on link click */
        navLinks.querySelectorAll('.nav-link').forEach((link) => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('open');
                navToggle.classList.remove('active');
                navToggle.setAttribute('aria-expanded', 'false');
            });
        });
    }

    /* ---------- SILKY CURSOR TRAIL ---------- */

    function initCursorTrail() {
        if (!isDesktop) return;
        const canvas = document.getElementById('trail-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        let width, height;
        function resize() {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        }
        resize();
        window.addEventListener('resize', resize);

        const trail = [];
        const maxTrailLength = 50;
        let lastX = 0, lastY = 0;
        let isMoving = false;
        let moveTimer = null;
        
        document.addEventListener('mousemove', (e) => {
            lastX = e.clientX;
            lastY = e.clientY;
            isMoving = true;
            clearTimeout(moveTimer);
            moveTimer = setTimeout(() => { isMoving = false; }, 100);
        });

        function renderTrail() {
            // Add point only when mouse is actually moving
            if (isMoving) {
                trail.push({ x: lastX, y: lastY, life: 1.0 });
            }
            
            // Age and remove old points
            for (let i = trail.length - 1; i >= 0; i--) {
                trail[i].life -= 0.02;
                if (trail[i].life <= 0) {
                    trail.splice(i, 1);
                }
            }

            ctx.clearRect(0, 0, width, height);

            if (trail.length < 2) {
                requestAnimationFrame(renderTrail);
                return;
            }

            // Draw the trail as individual fading segments
            for (let i = 1; i < trail.length; i++) {
                const p = trail[i];
                const prev = trail[i - 1];
                
                const alpha = p.life * 0.12;
                const lineW = p.life * 12;
                
                ctx.beginPath();
                ctx.moveTo(prev.x, prev.y);
                ctx.lineTo(p.x, p.y);
                ctx.strokeStyle = `rgba(201, 169, 110, ${alpha})`;
                ctx.lineWidth = lineW;
                ctx.lineCap = 'round';
                ctx.stroke();
            }

            requestAnimationFrame(renderTrail);
        }
        
        renderTrail();
    }

    /* ---------- SMOOTH SCROLL LINKS ---------- */

    function initSmoothLinks() {
        document.querySelectorAll('a[href^="#"]').forEach((link) => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(link.getAttribute('href'));
                if (target) {
                    const lenis = SmoothScroll.getLenis();
                    if (lenis) {
                        lenis.scrollTo(target, { offset: 0, duration: 1.5 });
                    } else {
                        target.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            });
        });
    }

    /* ---------- INIT ---------- */

    function init() {
        isDesktop = window.innerWidth > 768;
        
        // Global spotlight tracking (CSS hides it on mobile)
        document.addEventListener('mousemove', (e) => {
            document.documentElement.style.setProperty('--mouse-x', e.clientX + 'px');
            document.documentElement.style.setProperty('--mouse-y', e.clientY + 'px');
        });
        
        initCursor();
        initCursorTrail();
        initMagneticElements();
        initProductTilt();
        initNavToggle();
        initSmoothLinks();
    }

    /* Wait for DOM and other scripts */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return {};
})();
