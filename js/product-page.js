// Product Page Logic: Fetch, Populate, Reviews, Related, Zoom, Buy Now
document.addEventListener('DOMContentLoaded', async () => {
    const toggle = document.getElementById('nav-toggle');
    if(toggle) toggle.addEventListener('click', () => { document.getElementById('nav-links').classList.toggle('open'); toggle.classList.toggle('active'); });

    const authBtn = document.getElementById('nav-auth-btn');
    const token = localStorage.getItem('token');
    const userName = localStorage.getItem('userName');
    if (token && userName && authBtn) { authBtn.innerText = `Hi, ${userName}`; authBtn.href = 'account.html'; }

    const productId = new URLSearchParams(window.location.search).get('id');
    if (!productId) { document.getElementById('pdp-error').style.display = 'block'; return; }

    let product;
    try {
        const res = await fetch(`/api/products/${productId}`);
        if (!res.ok) throw new Error();
        product = await res.json();
    } catch { document.getElementById('pdp-error').style.display = 'block'; return; }

    // Track recently viewed
    if (window.VeloreRecent) VeloreRecent.add({ id: product._id, name: product.name, price: product.price, imageSrc: product.imageSrc });

    // Populate UI
    document.title = `VELORÉ — ${product.name}`;
    document.getElementById('pdp-img').src = product.imageSrc;
    document.getElementById('pdp-img').alt = product.name;
    document.getElementById('pdp-name').innerText = product.name;
    document.getElementById('pdp-desc').innerText = product.longDescription || product.description;
    document.getElementById('pdp-category').innerText = (product.category || 'luxury').toUpperCase();

    let priceHTML = `₹${product.price.toLocaleString()}`;
    if (product.originalPrice && product.originalPrice > product.price) priceHTML += `<span class="original">₹${product.originalPrice.toLocaleString()}</span>`;
    document.getElementById('pdp-price').innerHTML = priceHTML;

    if (product.rating) document.getElementById('pdp-rating').innerHTML = `★ ${product.rating} <span style="color:var(--color-gray)">(${product.reviews||0} reviews)</span>`;
    if (product.size) document.getElementById('pdp-size').innerText = `Size: ${product.size}`;

    // Stock
    const stockEl = document.getElementById('pdp-stock');
    if (product.stock <= 0) { stockEl.textContent = 'Out of Stock'; stockEl.className = 'pdp-stock low'; }
    else if (product.stock <= 10) { stockEl.textContent = `Only ${product.stock} left in stock — order soon!`; stockEl.className = 'pdp-stock low'; }
    else { stockEl.textContent = 'In Stock'; stockEl.className = 'pdp-stock ok'; }

    if (product.ingredients?.length) {
        document.getElementById('pdp-ingredients-section').style.display = 'block';
        document.getElementById('pdp-ingredients').innerHTML = product.ingredients.map(i => `<li>${i}</li>`).join('');
    }
    if (product.howToUse) {
        document.getElementById('pdp-howtouse-section').style.display = 'block';
        document.getElementById('pdp-howtouse').innerText = product.howToUse;
    }

    document.getElementById('pdp-container').style.display = 'flex';

    // Image Zoom
    const zoomContainer = document.getElementById('zoom-container');
    const img = document.getElementById('pdp-img');
    zoomContainer.addEventListener('mousemove', (e) => {
        const rect = zoomContainer.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        img.style.transformOrigin = `${x}% ${y}%`;
        img.style.transform = 'scale(1.8)';
        img.style.animation = 'none';
    });
    zoomContainer.addEventListener('mouseleave', () => {
        img.style.transform = 'scale(1)';
        img.style.animation = 'float 6s ease-in-out infinite';
    });

    // Wishlist
    const wlBtn = document.getElementById('pdp-wishlist');
    if (window.VeloreWishlist) {
        if (VeloreWishlist.has(product._id)) { wlBtn.innerHTML = '♥'; wlBtn.classList.add('wishlisted'); }
        wlBtn.addEventListener('click', () => {
            VeloreWishlist.toggle({ id: product._id, name: product.name, price: product.price, imageSrc: product.imageSrc });
            const isNow = VeloreWishlist.has(product._id);
            wlBtn.innerHTML = isNow ? '♥' : '♡';
            wlBtn.classList.toggle('wishlisted', isNow);
        });
    }

    // Add to Cart
    document.getElementById('pdp-add-cart').addEventListener('click', () => {
        VeloreCart.add({ id: product._id, name: product.name, price: product.price, imageSrc: product.imageSrc, quantity: 1 });
        if (window.VeloreToast) VeloreToast.show(`${product.name} added to cart`, 'cart');
        const btn = document.getElementById('pdp-add-cart');
        btn.textContent = 'Added ✓'; setTimeout(() => btn.textContent = 'Add to Cart', 2000);
    });

    // Buy Now
    document.getElementById('pdp-buy-btn').addEventListener('click', async () => {
        if (!localStorage.getItem('token')) {
            if (window.VeloreToast) VeloreToast.show('Please sign in to purchase.', 'error');
            return;
        }
        const buyBtn = document.getElementById('pdp-buy-btn');
        buyBtn.disabled = true;
        buyBtn.textContent = 'Processing...';
        
        VeloreCart.add({ id: product._id, name: product.name, price: product.price, imageSrc: product.imageSrc, quantity: 1 });
        try {
            // Get Razorpay key from backend
            const keyRes = await fetch('/api/razorpay-key');
            const keyData = await keyRes.json();
            
            const orderRes = await fetch('/api/create-order', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: product.price, items: [{ productId: product._id, name: product.name, price: product.price, quantity: 1, imageSrc: product.imageSrc }], customerDetails: { name: userName || 'Customer', email: '', address: 'Pending', phone: 'Pending' } })
            });
            const order = await orderRes.json();
            if (order.error) throw new Error(order.error);
            const rzp = new Razorpay({ key: keyData.key, amount: order.amount, currency: order.currency, name: 'VELORÉ', description: product.name, order_id: order.id, handler: async (r) => {
                const v = await fetch('/api/verify-payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r) });
                const d = await v.json();
                if (d.success) VeloreToast.show('Payment successful!', 'success'); else VeloreToast.show('Verification failed!', 'error');
            }, theme: { color: '#c9a050' } });
            rzp.open();
        } catch(e) { VeloreToast.show('Checkout error: ' + e.message, 'error'); }
        finally { buyBtn.disabled = false; buyBtn.textContent = 'Buy Now'; }
    });

    // ---- REVIEWS ----
    document.getElementById('reviews-section').style.display = 'block';
    let selectedRating = 0;
    document.querySelectorAll('#star-input span').forEach(star => {
        star.addEventListener('click', () => {
            selectedRating = parseInt(star.dataset.star);
            document.querySelectorAll('#star-input span').forEach((s, i) => {
                s.textContent = i < selectedRating ? '★' : '☆';
                s.classList.toggle('active', i < selectedRating);
            });
        });
    });

    async function loadReviews() {
        try {
            const res = await fetch(`/api/reviews/${productId}`);
            const reviews = await res.json();
            const container = document.getElementById('reviews-list');
            if (!reviews.length) { container.innerHTML = '<p style="color:var(--color-gray);padding:1rem 0">No reviews yet. Be the first!</p>'; return; }
            container.innerHTML = reviews.map(r => `
                <div class="review-item">
                    <div class="review-header"><span class="review-author">${r.userName}</span><span class="review-date">${new Date(r.createdAt).toLocaleDateString('en-IN')}</span></div>
                    <div class="review-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
                    <p class="review-text">${r.comment || ''}</p>
                </div>
            `).join('');
        } catch(e) { console.error(e); }
    }
    loadReviews();

    document.getElementById('review-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!selectedRating) { VeloreToast.show('Please select a rating', 'error'); return; }
        if (!token) { VeloreToast.show('Please sign in to review', 'error'); return; }
        try {
            const res = await fetch('/api/reviews', {
                method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ productId, rating: selectedRating, comment: document.getElementById('review-comment').value })
            });
            const data = await res.json();
            if (res.ok) { VeloreToast.show('Review submitted!', 'success'); document.getElementById('review-comment').value = ''; selectedRating = 0; document.querySelectorAll('#star-input span').forEach(s => { s.textContent = '☆'; s.classList.remove('active'); }); loadReviews(); }
            else VeloreToast.show(data.error, 'error');
        } catch(e) { VeloreToast.show('Failed to submit review', 'error'); }
    });

    // ---- RELATED PRODUCTS ----
    try {
        const res = await fetch(`/api/products/${productId}/related`);
        const related = await res.json();
        if (related.length) {
            document.getElementById('related-section').style.display = 'block';
            document.getElementById('related-grid').innerHTML = related.map(p => `
                <div class="related-card" onclick="window.location.href='product.html?id=${p._id}'">
                    <img src="${p.imageSrc}" alt="${p.name}" loading="lazy">
                    <div class="related-card-body">
                        <p class="related-card-name">${p.name}</p>
                        <p class="related-card-price">₹${p.price.toLocaleString()}</p>
                    </div>
                </div>
            `).join('');
        }
    } catch(e) { console.error(e); }
});
