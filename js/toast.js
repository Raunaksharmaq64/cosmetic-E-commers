// ==================== VELORÉ TOAST NOTIFICATIONS ====================
(function() {
    // Create container
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position:fixed;top:90px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
    document.body.appendChild(container);

    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ',
        cart: '🛒',
        heart: '♥'
    };

    function show(message, type = 'success', duration = 3000) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            pointer-events:auto;display:flex;align-items:center;gap:12px;
            background:rgba(20,20,20,0.95);backdrop-filter:blur(12px);
            border:1px solid rgba(255,255,255,0.08);border-radius:8px;
            padding:14px 20px;min-width:280px;max-width:380px;
            color:#f5f5f5;font-family:'Inter',sans-serif;font-size:0.85rem;
            box-shadow:0 8px 32px rgba(0,0,0,0.4);
            transform:translateX(120%);transition:transform 0.4s cubic-bezier(0.16,1,0.3,1),opacity 0.3s;
            opacity:0;
        `;

        const iconColor = type === 'error' ? '#ff6b6b' : type === 'heart' ? '#ff6b8a' : '#C9A96E';
        toast.innerHTML = `
            <span style="font-size:1.1rem;color:${iconColor};flex-shrink:0;">${icons[type] || icons.success}</span>
            <span style="flex:1;line-height:1.4;">${message}</span>
            <button onclick="this.parentElement.remove()" style="background:none;border:none;color:#888;cursor:pointer;font-size:1rem;padding:0 0 0 8px;">✕</button>
        `;

        container.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
        });

        // Auto remove
        setTimeout(() => {
            toast.style.transform = 'translateX(120%)';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 400);
        }, duration);
    }

    window.VeloreToast = { show };
})();
