/* ==========================================
   VELORÉ — Floating Botanical Particles
   Canvas-based particle overlay for Story section
   ========================================== */

const Particles = (() => {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return { start() {}, stop() {} };

    const ctx = canvas.getContext('2d');
    let particles = [];
    let animId = null;
    let isActive = false;
    let w, h;

    class Particle {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * w;
            this.y = Math.random() * h;
            this.size = Math.random() * 3 + 1;
            this.speedX = (Math.random() - 0.5) * 0.4;
            this.speedY = -Math.random() * 0.6 - 0.2;
            this.opacity = Math.random() * 0.5 + 0.1;
            this.life = Math.random() * 200 + 100;
            this.age = 0;
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            this.age++;

            /* Fade in and out */
            const progress = this.age / this.life;
            if (progress < 0.2) {
                this.currentOpacity = this.opacity * (progress / 0.2);
            } else if (progress > 0.8) {
                this.currentOpacity = this.opacity * (1 - (progress - 0.8) / 0.2);
            } else {
                this.currentOpacity = this.opacity;
            }

            if (this.age >= this.life || this.y < -10 || this.x < -10 || this.x > w + 10) {
                this.reset();
                this.y = h + 10;
            }
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(201, 169, 110, ${this.currentOpacity})`;
            ctx.fill();
        }
    }

    function resize() {
        w = canvas.width = canvas.offsetWidth;
        h = canvas.height = canvas.offsetHeight;
    }

    function animate() {
        if (!isActive) return;
        ctx.clearRect(0, 0, w, h);

        particles.forEach(p => {
            p.update();
            p.draw();
        });

        animId = requestAnimationFrame(animate);
    }

    function start() {
        if (isActive) return;
        isActive = true;
        resize();

        const count = window.innerWidth <= 768 ? 0 : window.innerWidth <= 1024 ? 20 : 40;
        particles = [];
        for (let i = 0; i < count; i++) {
            particles.push(new Particle());
        }

        animate();
    }

    function stop() {
        isActive = false;
        if (animId) cancelAnimationFrame(animId);
    }

    window.addEventListener('resize', () => {
        if (isActive) resize();
    });

    return { start, stop };
})();
