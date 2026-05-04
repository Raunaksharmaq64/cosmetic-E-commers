// ==================== VELORÉ CART SYSTEM ====================
// Handles cart state via localStorage, cart drawer UI, and badge count

(function() {
    const CART_KEY = 'velore_cart';

    // Get cart from localStorage
    function getCart() {
        try {
            return JSON.parse(localStorage.getItem(CART_KEY)) || [];
        } catch { return []; }
    }

    // Save cart to localStorage
    function saveCart(cart) {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
        updateBadge();
        renderCartDrawer();
    }

    // Add item to cart
    function addToCart(item) {
        const cart = getCart();
        const existing = cart.find(c => c.id === item.id);
        if (existing) {
            existing.quantity += item.quantity || 1;
        } else {
            cart.push({ ...item, quantity: item.quantity || 1 });
        }
        saveCart(cart);
        openCartDrawer();
    }

    // Remove item
    function removeFromCart(id) {
        let cart = getCart().filter(c => c.id !== id);
        saveCart(cart);
    }

    // Update quantity
    function updateQuantity(id, qty) {
        const cart = getCart();
        const item = cart.find(c => c.id === id);
        if (item) {
            item.quantity = Math.max(1, qty);
        }
        saveCart(cart);
    }

    // Get total price
    function getTotal() {
        return getCart().reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    // Get total item count
    function getCount() {
        return getCart().reduce((sum, item) => sum + item.quantity, 0);
    }

    // Update badge count in navbar
    function updateBadge() {
        const badges = document.querySelectorAll('#cart-badge, .cart-badge');
        const count = getCount();
        badges.forEach(b => {
            b.textContent = count;
            b.style.display = count > 0 ? 'inline-flex' : 'none';
        });
    }

    // Render cart drawer items
    function renderCartDrawer() {
        const container = document.getElementById('cart-items');
        const totalEl = document.getElementById('cart-total-price');
        const checkoutBtn = document.getElementById('cart-checkout-btn');
        if (!container) return;

        const cart = getCart();

        if (cart.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:40px 0;color:#888;"><p style="font-size:1.2rem;margin-bottom:0.5rem;">Your cart is empty</p><p style="font-size:0.85rem;">Discover our luxury collection</p></div>';
            if (totalEl) totalEl.textContent = '₹0';
            if (checkoutBtn) checkoutBtn.style.display = 'none';
            return;
        }

        if (checkoutBtn) checkoutBtn.style.display = 'block';

        container.innerHTML = cart.map(item => `
            <div class="cart-item" data-id="${item.id}">
                <img src="${item.imageSrc}" alt="${item.name}" class="cart-item-img">
                <div class="cart-item-info">
                    <p class="cart-item-name">${item.name}</p>
                    <p class="cart-item-price">₹${item.price.toLocaleString()}</p>
                    <div class="cart-qty-controls">
                        <button class="qty-btn" data-action="dec" data-id="${item.id}">−</button>
                        <span class="qty-value">${item.quantity}</span>
                        <button class="qty-btn" data-action="inc" data-id="${item.id}">+</button>
                    </div>
                </div>
                <button class="cart-remove" data-id="${item.id}">✕</button>
            </div>
        `).join('');

        if (totalEl) totalEl.textContent = `₹${getTotal().toLocaleString()}`;

        // Bind events
        container.querySelectorAll('.qty-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const cart = getCart();
                const item = cart.find(c => c.id === id);
                if (!item) return;
                if (btn.dataset.action === 'inc') updateQuantity(id, item.quantity + 1);
                else if (btn.dataset.action === 'dec') {
                    if (item.quantity <= 1) removeFromCart(id);
                    else updateQuantity(id, item.quantity - 1);
                }
            });
        });

        container.querySelectorAll('.cart-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeFromCart(btn.dataset.id);
            });
        });
    }

    // Open / Close Drawer
    function openCartDrawer() {
        const drawer = document.getElementById('cart-drawer');
        if (drawer) drawer.classList.add('open');
    }

    function closeCartDrawer() {
        const drawer = document.getElementById('cart-drawer');
        if (drawer) drawer.classList.remove('open');
    }

    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
        updateBadge();
        renderCartDrawer();

        // Open cart button
        const openBtn = document.getElementById('open-cart');
        if (openBtn) openBtn.addEventListener('click', (e) => { e.preventDefault(); openCartDrawer(); });

        // Close cart
        const closeBtn = document.getElementById('close-cart');
        if (closeBtn) closeBtn.addEventListener('click', closeCartDrawer);

        const overlay = document.getElementById('cart-overlay');
        if (overlay) overlay.addEventListener('click', closeCartDrawer);

        // Checkout button
        const checkoutBtn = document.getElementById('cart-checkout-btn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => {
                const cart = getCart();
                if (cart.length === 0) { alert('Your cart is empty.'); return; }
                const token = localStorage.getItem('token');
                if (!token) {
                    alert('Please sign in to checkout.');
                    return;
                }
                // For now, create a Razorpay order with all cart items
                checkoutAll();
            });
        }
    });

    // Checkout all items via Razorpay
    async function checkoutAll() {
        const cart = getCart();
        const total = getTotal();
        const userName = localStorage.getItem('userName') || 'Customer';

        try {
            const orderRes = await fetch('/api/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: total,
                    items: cart.map(item => ({
                        productId: item.id,
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity,
                        imageSrc: item.imageSrc
                    })),
                    customerDetails: {
                        name: userName,
                        email: localStorage.getItem('userEmail') || '',
                        address: 'Pending',
                        phone: 'Pending'
                    }
                })
            });

            const order = await orderRes.json();
            if (order.error) throw new Error(order.error);

            if (typeof Razorpay === 'undefined') {
                // Load Razorpay script dynamically
                const script = document.createElement('script');
                script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                script.onload = () => openRazorpay(order, cart);
                document.body.appendChild(script);
            } else {
                openRazorpay(order, cart);
            }

        } catch(err) {
            alert('Checkout Error: ' + err.message);
        }
    }

    function openRazorpay(order, cart) {
        const options = {
            key: 'your_razorpay_key_id', // Replace in production
            amount: order.amount,
            currency: order.currency,
            name: "VELORÉ",
            description: `${cart.length} item(s) — Luxury Collection`,
            order_id: order.id,
            handler: async function (response) {
                const verifyRes = await fetch('/api/verify-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature
                    })
                });
                const data = await verifyRes.json();
                if (data.success) {
                    alert('Payment Successful! Your luxury awaits.');
                    localStorage.removeItem(CART_KEY);
                    updateBadge();
                    renderCartDrawer();
                    closeCartDrawer();
                } else {
                    alert('Payment verification failed!');
                }
            },
            theme: { color: "#c9a050" }
        };
        const rzp = new Razorpay(options);
        rzp.open();
    }

    // Expose globally
    window.VeloreCart = {
        add: addToCart,
        remove: removeFromCart,
        get: getCart,
        getTotal,
        getCount,
        open: openCartDrawer,
        close: closeCartDrawer
    };
})();
