// ==================== VELORÉ PREMIUM UTILITIES ====================
// Back to Top, Recently Viewed, Newsletter Popup, Skeleton Loading, Sign-In Prompt

(function() {

    // Shared modal flag — only one popup per page visit
    let modalShown = false;

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
            // Don't show if another modal is already active or was shown
            if (modalShown || localStorage.getItem(NL_KEY)) return;
            modalShown = true;
            
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;animation:fadeIn 0.4s ease;transition:opacity 0.3s ease;';

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

            const dismissNL = () => {
                localStorage.setItem(NL_KEY, '1');
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 300);
            };

            document.getElementById('nl-close').addEventListener('click', dismissNL);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) dismissNL(); });

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
                    setTimeout(() => { overlay.style.opacity = '0'; setTimeout(() => overlay.remove(), 300); }, 3000);
                } catch(err) {
                    document.getElementById('nl-msg').textContent = 'Something went wrong.';
                    document.getElementById('nl-msg').style.display = 'block';
                }
            });
        }, 15000); // Show after 15 seconds (gives sign-in prompt priority)
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

    // ---- SIGN-IN PROMPT FOR GUESTS ----
    function showSignInPrompt() {
        const token = localStorage.getItem('token');
        const PROMPT_KEY = 'velore_signin_prompt_dismissed';
        
        if (token || localStorage.getItem(PROMPT_KEY)) return;
        
        setTimeout(() => {
            // Don't show if another modal beat us to it
            if (modalShown || localStorage.getItem(PROMPT_KEY)) return;
            modalShown = true;
            
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.7);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;animation:fadeIn 0.5s ease;opacity:1;transition:opacity 0.3s ease;';

            overlay.innerHTML = `
                <div style="background:linear-gradient(145deg, rgba(20,20,20,0.95), rgba(10,10,10,0.98));border:1px solid rgba(201,169,110,0.3);border-radius:16px;padding:3rem 2.5rem;max-width:400px;width:90%;text-align:center;position:relative;box-shadow:0 30px 60px rgba(0,0,0,0.7), inset 0 0 20px rgba(201,169,110,0.05);">
                    <button id="sip-close" style="position:absolute;top:16px;right:20px;background:none;border:none;color:#888;font-size:1.5rem;cursor:pointer;transition:color 0.3s;">✕</button>
                    <div style="width:60px;height:60px;border-radius:50%;background:rgba(201,169,110,0.1);color:#C9A96E;font-size:1.8rem;display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem;border:1px solid rgba(201,169,110,0.2);">✨</div>
                    <h3 style="font-family:'Playfair Display',serif;font-size:1.6rem;color:#f5f5f5;margin-bottom:0.8rem;letter-spacing:0.05em;">Unlock the Premium Experience</h3>
                    <p style="color:#aaa;font-size:0.9rem;margin-bottom:2rem;line-height:1.6;">Sign in to access exclusive member-only offers, faster checkout, and personalized product recommendations.</p>
                    <div style="display:flex;flex-direction:column;gap:1rem;">
                        <a href="account.html" style="display:block;padding:14px;background:#C9A96E;color:#000;text-decoration:none;border-radius:6px;font-family:'Inter',sans-serif;font-size:0.85rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;transition:transform 0.3s, box-shadow 0.3s;">Sign In / Register</a>
                        <button id="sip-later" style="background:transparent;border:none;color:#888;font-size:0.8rem;text-decoration:underline;cursor:pointer;font-family:'Inter',sans-serif;">Maybe Later</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            const closePrompt = () => {
                localStorage.setItem(PROMPT_KEY, '1');
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 300);
            };

            document.getElementById('sip-close').addEventListener('click', closePrompt);
            document.getElementById('sip-later').addEventListener('click', closePrompt);
            document.getElementById('sip-close').addEventListener('mouseenter', function() { this.style.color = '#fff'; });
            document.getElementById('sip-close').addEventListener('mouseleave', function() { this.style.color = '#888'; });
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closePrompt(); });
        }, 5000); // Show after 5 seconds
    }

    document.addEventListener('DOMContentLoaded', showSignInPrompt);

})();
