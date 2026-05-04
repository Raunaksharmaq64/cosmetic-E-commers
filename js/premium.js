// ==================== VELORÉ PREMIUM UTILITIES ====================
// Back to Top, Recently Viewed, Newsletter Popup, Skeleton Loading

(function() {

    // ---- BACK TO TOP ----
    const btn = document.createElement('button');
    btn.id = 'back-to-top';
    btn.innerHTML = '↑';
    btn.setAttribute('aria-label', 'Back to top');
    btn.style.cssText = `
        position:fixed;bottom:30px;right:30px;z-index:9990;
        width:44px;height:44px;border-radius:50%;border:1px solid rgba(201,169,110,0.4);
        background:rgba(15,15,15,0.9);backdrop-filter:blur(8px);color:#C9A96E;
        font-size:1.1rem;cursor:pointer;opacity:0;visibility:hidden;
        transition:all 0.3s;display:flex;align-items:center;justify-content:center;
    `;
    btn.addEventListener('mouseenter', () => { btn.style.background = '#C9A96E'; btn.style.color = '#0F0F0F'; });
    btn.addEventListener('mouseleave', () => { btn.style.background = 'rgba(15,15,15,0.9)'; btn.style.color = '#C9A96E'; });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    document.body.appendChild(btn);

    window.addEventListener('scroll', () => {
        if (window.scrollY > 600) { btn.style.opacity = '1'; btn.style.visibility = 'visible'; }
        else { btn.style.opacity = '0'; btn.style.visibility = 'hidden'; }
    });

    // ---- RECENTLY VIEWED ----
    const RV_KEY = 'velore_recently_viewed';

    function addRecentlyViewed(product) {
        let list = getRecentlyViewed();
        list = list.filter(p => p.id !== product.id);
        list.unshift(product);
        if (list.length > 8) list = list.slice(0, 8);
        localStorage.setItem(RV_KEY, JSON.stringify(list));
    }

    function getRecentlyViewed() {
        try { return JSON.parse(localStorage.getItem(RV_KEY)) || []; }
        catch { return []; }
    }

    window.VeloreRecent = { add: addRecentlyViewed, get: getRecentlyViewed };

    // ---- NEWSLETTER POPUP ----
    const NL_KEY = 'velore_newsletter_dismissed';

    function showNewsletter() {
        if (localStorage.getItem(NL_KEY)) return;
        
        setTimeout(() => {
            if (localStorage.getItem(NL_KEY)) return;
            
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;animation:fadeIn 0.4s ease;';

            overlay.innerHTML = `
                <div style="background:rgba(20,20,20,0.95);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:3rem;max-width:420px;width:90%;text-align:center;position:relative;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
                    <button id="nl-close" style="position:absolute;top:12px;right:16px;background:none;border:none;color:#888;font-size:1.3rem;cursor:pointer;">✕</button>
                    <p style="font-size:0.7rem;letter-spacing:0.3em;text-transform:uppercase;color:#C9A96E;margin-bottom:1rem;">Exclusive Offer</p>
                    <h3 style="font-family:'Playfair Display',serif;font-size:1.8rem;color:#f5f5f5;margin-bottom:0.5rem;">Get 10% Off</h3>
                    <p style="color:#888;font-size:0.9rem;margin-bottom:1.5rem;line-height:1.6;">Subscribe to our newsletter and receive an exclusive welcome discount on your first order.</p>
                    <div style="display:flex;gap:8px;">
                        <input type="email" id="nl-email" placeholder="Your email address" style="flex:1;padding:12px 14px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:4px;color:#f5f5f5;font-family:'Inter',sans-serif;font-size:0.85rem;outline:none;">
                        <button id="nl-submit" style="padding:12px 20px;background:#C9A96E;color:#0F0F0F;border:none;border-radius:4px;font-family:'Inter',sans-serif;font-size:0.8rem;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;white-space:nowrap;">Subscribe</button>
                    </div>
                    <p id="nl-msg" style="margin-top:0.8rem;font-size:0.8rem;color:#C9A96E;display:none;"></p>
                    <p style="margin-top:1rem;font-size:0.7rem;color:#666;">Use code <strong style="color:#C9A96E;">WELCOME10</strong> at checkout</p>
                </div>
            `;

            document.body.appendChild(overlay);

            document.getElementById('nl-close').addEventListener('click', () => {
                localStorage.setItem(NL_KEY, '1');
                overlay.remove();
            });
            overlay.addEventListener('click', (e) => { if (e.target === overlay) { localStorage.setItem(NL_KEY, '1'); overlay.remove(); } });

            document.getElementById('nl-submit').addEventListener('click', async () => {
                const email = document.getElementById('nl-email').value;
                if (!email) return;
                try {
                    const res = await fetch('/api/newsletter', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email })
                    });
                    const data = await res.json();
                    document.getElementById('nl-msg').textContent = data.message;
                    document.getElementById('nl-msg').style.display = 'block';
                    localStorage.setItem(NL_KEY, '1');
                    setTimeout(() => overlay.remove(), 3000);
                } catch(err) {
                    document.getElementById('nl-msg').textContent = 'Something went wrong.';
                    document.getElementById('nl-msg').style.display = 'block';
                }
            });
        }, 8000); // Show after 8 seconds
    }

    document.addEventListener('DOMContentLoaded', showNewsletter);

    // ---- SKELETON LOADER UTILITY ----
    function createSkeletons(container, count = 6) {
        let html = '';
        for (let i = 0; i < count; i++) {
            html += `
                <div class="skeleton-card" style="background:rgba(22,22,22,0.6);border:1px solid rgba(255,255,255,0.04);border-radius:8px;overflow:hidden;">
                    <div style="width:100%;aspect-ratio:1/1;background:linear-gradient(110deg,#1a1a1a 30%,#252525 50%,#1a1a1a 70%);background-size:200% 100%;animation:shimmer 1.5s infinite;"></div>
                    <div style="padding:1.2rem;">
                        <div style="height:10px;width:40%;background:#222;border-radius:4px;margin-bottom:10px;animation:shimmer 1.5s infinite;background-size:200% 100%;background:linear-gradient(110deg,#1a1a1a 30%,#252525 50%,#1a1a1a 70%);"></div>
                        <div style="height:16px;width:80%;background:#222;border-radius:4px;margin-bottom:8px;animation:shimmer 1.5s infinite;background-size:200% 100%;background:linear-gradient(110deg,#1a1a1a 30%,#252525 50%,#1a1a1a 70%);"></div>
                        <div style="height:12px;width:60%;background:#222;border-radius:4px;animation:shimmer 1.5s infinite;background-size:200% 100%;background:linear-gradient(110deg,#1a1a1a 30%,#252525 50%,#1a1a1a 70%);"></div>
                    </div>
                </div>
            `;
        }
        container.innerHTML = html;
    }

    // Add shimmer keyframe
    const shimmerStyle = document.createElement('style');
    shimmerStyle.textContent = '@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}';
    document.head.appendChild(shimmerStyle);

    window.VeloreSkeleton = { show: createSkeletons };
})();
