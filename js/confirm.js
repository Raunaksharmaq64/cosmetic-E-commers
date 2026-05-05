// ==================== VELORÉ — Premium Confirm Modal ====================
// Replaces native browser confirm() with a beautiful themed modal
// Usage: showConfirmModal('Title', 'Message', 'Confirm Text', onConfirmCallback, optionalColor)

function showConfirmModal(title, message, confirmText, onConfirm, confirmColor) {
    const existing = document.getElementById('velore-confirm-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'velore-confirm-overlay';
    overlay.style.cssText = `
        position:fixed;inset:0;z-index:999999;
        background:rgba(0,0,0,0.65);backdrop-filter:blur(12px);
        display:flex;align-items:center;justify-content:center;
        opacity:0;transition:opacity 0.3s ease;
    `;

    const accent = confirmColor || '#C9A96E';

    overlay.innerHTML = `
        <div style="
            background:linear-gradient(160deg, rgba(24,24,24,0.97), rgba(12,12,12,0.99));
            border:1px solid rgba(201,169,110,0.2);
            border-radius:16px;padding:2.5rem 2rem;
            max-width:380px;width:88%;text-align:center;
            box-shadow:0 30px 80px rgba(0,0,0,0.7),0 0 0 1px rgba(255,255,255,0.03) inset;
            transform:scale(0.92) translateY(10px);
            transition:transform 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.35s ease;
            opacity:0;
        " id="velore-confirm-card">
            <div style="width:50px;height:50px;border-radius:50%;background:rgba(201,169,110,0.08);border:1px solid rgba(201,169,110,0.15);display:flex;align-items:center;justify-content:center;margin:0 auto 1.2rem;font-size:1.4rem;">⚠️</div>
            <h3 style="font-family:'Playfair Display',serif;font-size:1.35rem;color:#f5f5f5;margin-bottom:0.6rem;letter-spacing:0.03em;">${title}</h3>
            <p style="color:#999;font-size:0.88rem;line-height:1.6;margin-bottom:2rem;">${message}</p>
            <div style="display:flex;gap:0.8rem;justify-content:center;">
                <button id="velore-confirm-cancel" style="
                    flex:1;padding:12px 20px;
                    background:transparent;
                    border:1px solid rgba(255,255,255,0.1);
                    color:#ccc;border-radius:8px;
                    font-family:'Inter',sans-serif;font-size:0.82rem;
                    font-weight:500;letter-spacing:0.05em;
                    cursor:pointer;transition:all 0.25s;
                ">Cancel</button>
                <button id="velore-confirm-ok" style="
                    flex:1;padding:12px 20px;
                    background:${accent};
                    border:none;color:#0F0F0F;border-radius:8px;
                    font-family:'Inter',sans-serif;font-size:0.82rem;
                    font-weight:600;letter-spacing:0.05em;
                    cursor:pointer;transition:all 0.25s;
                ">${confirmText || 'Confirm'}</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        const card = document.getElementById('velore-confirm-card');
        if (card) { card.style.opacity = '1'; card.style.transform = 'scale(1) translateY(0)'; }
    });

    const closeModal = () => {
        overlay.style.opacity = '0';
        const card = document.getElementById('velore-confirm-card');
        if (card) { card.style.transform = 'scale(0.92) translateY(10px)'; card.style.opacity = '0'; }
        setTimeout(() => overlay.remove(), 300);
    };

    document.getElementById('velore-confirm-cancel').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    document.getElementById('velore-confirm-ok').addEventListener('click', () => {
        closeModal();
        if (onConfirm) setTimeout(onConfirm, 150);
    });

    // Hover effects
    const cancelBtn = document.getElementById('velore-confirm-cancel');
    const okBtn = document.getElementById('velore-confirm-ok');
    cancelBtn.addEventListener('mouseenter', () => { cancelBtn.style.borderColor = 'rgba(255,255,255,0.25)'; cancelBtn.style.color = '#fff'; });
    cancelBtn.addEventListener('mouseleave', () => { cancelBtn.style.borderColor = 'rgba(255,255,255,0.1)'; cancelBtn.style.color = '#ccc'; });
    okBtn.addEventListener('mouseenter', () => { okBtn.style.filter = 'brightness(1.15)'; okBtn.style.transform = 'translateY(-1px)'; });
    okBtn.addEventListener('mouseleave', () => { okBtn.style.filter = 'none'; okBtn.style.transform = 'none'; });
}
