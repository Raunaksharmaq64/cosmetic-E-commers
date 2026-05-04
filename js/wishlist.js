// ==================== VELORÉ WISHLIST ====================
(function() {
    const KEY = 'velore_wishlist';

    function get() {
        try { return JSON.parse(localStorage.getItem(KEY)) || []; }
        catch { return []; }
    }

    function save(list) {
        localStorage.setItem(KEY, JSON.stringify(list));
        updateAllIcons();
    }

    function toggle(product) {
        let list = get();
        const idx = list.findIndex(p => p.id === product.id);
        if (idx > -1) {
            list.splice(idx, 1);
            if (window.VeloreToast) VeloreToast.show('Removed from wishlist', 'info');
        } else {
            list.push(product);
            if (window.VeloreToast) VeloreToast.show('Added to wishlist', 'heart');
        }
        save(list);
    }

    function has(id) {
        return get().some(p => p.id === id);
    }

    function remove(id) {
        save(get().filter(p => p.id !== id));
    }

    function updateAllIcons() {
        document.querySelectorAll('[data-wishlist-id]').forEach(btn => {
            const id = btn.dataset.wishlistId;
            btn.classList.toggle('wishlisted', has(id));
            btn.innerHTML = has(id) ? '♥' : '♡';
        });
    }

    window.VeloreWishlist = { get, toggle, has, remove, updateAllIcons };
})();
