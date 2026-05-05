// VELORÉ — 3-Step Checkout Flow
document.addEventListener('DOMContentLoaded', async () => {
    const toggle = document.getElementById('nav-toggle');
    if(toggle) toggle.addEventListener('click', () => { document.getElementById('nav-links').classList.toggle('open'); toggle.classList.toggle('active'); });

    const token = localStorage.getItem('token');
    const authBtn = document.getElementById('nav-auth-btn');
    const userName = localStorage.getItem('userName');
    if(token && userName && authBtn) { authBtn.innerText = `Hi, ${userName}`; authBtn.href = 'account.html'; }

    if(!token) { alert('Please sign in to checkout.'); window.location.href = 'index.html'; return; }

    const headers = { Authorization: `Bearer ${token}` };
    const jsonHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    // Cart data
    let cartItems = [];
    try { cartItems = JSON.parse(localStorage.getItem('velore_cart')) || []; } catch { cartItems = []; }
    if(!cartItems.length) {
        document.getElementById('checkout-page').style.display = 'none';
        document.getElementById('checkout-empty').style.display = 'block';
        return;
    }

    let couponDiscount = 0, couponCode = '', selectedAddrId = null, userAddresses = [];
    let currentStep = 1;

    // Step navigation
    function goToStep(n) {
        currentStep = n;
        document.querySelectorAll('.checkout-panel').forEach(p => p.classList.remove('active'));
        document.getElementById(`panel-${n}`).classList.add('active');
        document.querySelectorAll('.step').forEach((s,i) => {
            s.classList.remove('active','done');
            if(i+1 < n) s.classList.add('done');
            if(i+1 === n) s.classList.add('active');
        });
        document.querySelectorAll('.step-line').forEach((l,i) => { l.classList.toggle('done', i+1 < n); });
        window.scrollTo({top:0,behavior:'smooth'});
    }

    // Render Step 1
    function renderSummary() {
        const container = document.getElementById('cs-items');
        if(!cartItems.length) { container.innerHTML = '<p style="padding:2rem;text-align:center;color:var(--color-gray)">Cart is empty</p>'; return; }
        container.innerHTML = cartItems.map((item,i) => `
            <div class="cs-item">
                <img src="${item.imageSrc}" alt="${item.name}">
                <div class="cs-item-info">
                    <p class="cs-item-name">${item.name}</p>
                    <p class="cs-item-price">₹${item.price.toLocaleString()}</p>
                    <div class="cs-item-qty">
                        <button class="cs-qty-btn" onclick="changeQty(${i},-1)">−</button>
                        <span class="cs-qty-val">${item.quantity}</span>
                        <button class="cs-qty-btn" onclick="changeQty(${i},1)">+</button>
                    </div>
                </div>
                <button class="cs-remove" onclick="removeItem(${i})">✕ Remove</button>
            </div>
        `).join('');
        renderPriceBreakdown();
    }

    function renderPriceBreakdown() {
        const subtotal = cartItems.reduce((s,i) => s + i.price * i.quantity, 0);
        const delivery = subtotal >= 2000 ? 0 : 99;
        const total = subtotal - couponDiscount + delivery;
        const html = `
            <div class="pb-row"><span>Subtotal</span><span>₹${subtotal.toLocaleString()}</span></div>
            ${couponDiscount ? `<div class="pb-row discount"><span>Coupon (${couponCode})</span><span>-₹${couponDiscount.toLocaleString()}</span></div>` : ''}
            <div class="pb-row"><span>Delivery</span><span>${delivery === 0 ? '<span style="color:#4caf50">FREE</span>' : '₹'+delivery}</span></div>
            <div class="pb-row total"><span>Total</span><span>₹${total.toLocaleString()}</span></div>
        `;
        document.getElementById('price-breakdown').innerHTML = html;
        const payPB = document.getElementById('pay-price-breakdown');
        if(payPB) payPB.innerHTML = html;
    }

    window.changeQty = function(idx, delta) {
        cartItems[idx].quantity = Math.max(1, cartItems[idx].quantity + delta);
        localStorage.setItem('velore_cart', JSON.stringify(cartItems));
        renderSummary();
    };
    window.removeItem = function(idx) {
        cartItems.splice(idx,1);
        localStorage.setItem('velore_cart', JSON.stringify(cartItems));
        if(!cartItems.length) { window.location.reload(); return; }
        renderSummary();
    };

    // Coupon
    document.getElementById('coupon-apply').addEventListener('click', async () => {
        const code = document.getElementById('coupon-input').value.trim();
        const msg = document.getElementById('coupon-msg');
        if(!code) return;
        const subtotal = cartItems.reduce((s,i) => s + i.price * i.quantity, 0);
        try {
            const res = await fetch('/api/coupon/validate', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({code, amount:subtotal})});
            const data = await res.json();
            if(res.ok) { couponDiscount = data.discount; couponCode = data.code; msg.textContent = `✓ ${data.percent}% off applied (-₹${data.discount})`; msg.style.color = '#4caf50'; }
            else { couponDiscount = 0; couponCode = ''; msg.textContent = data.error; msg.style.color = '#ff6b6b'; }
            msg.style.display = 'block';
            renderPriceBreakdown();
        } catch { msg.textContent = 'Error validating coupon'; msg.style.color = '#ff6b6b'; msg.style.display = 'block'; }
    });

    // Step 2: Load addresses
    async function loadAddresses() {
        try {
            const res = await fetch('/api/auth/me', { headers });
            if(res.ok) {
                const user = await res.json();
                userAddresses = user.addresses || [];
                renderCheckoutAddresses();
            }
        } catch(e) { console.error(e); }
    }

    function renderCheckoutAddresses() {
        const grid = document.getElementById('checkout-addr-grid');
        if(!userAddresses.length) {
            grid.innerHTML = '<p style="color:var(--color-gray);padding:1rem 0">No saved addresses. Please add one below.</p>';
            return;
        }
        grid.innerHTML = userAddresses.map(a => `
            <div class="addr-select-card ${a.isDefault&&!selectedAddrId ? 'selected' : ''} ${selectedAddrId===a._id ? 'selected' : ''}" data-addr-id="${a._id}" onclick="selectAddr('${a._id}')">
                <div class="check-icon">✓</div>
                <div class="addr-label">${a.label||'Home'}</div>
                <p class="addr-name">${a.fullName||''}</p>
                <p class="addr-text">${a.line1||''}${a.line2?', '+a.line2:''}, ${a.city||''}, ${a.state||''} - ${a.pincode||''}</p>
                <p class="addr-phone">📞 ${a.phone||''}</p>
            </div>
        `).join('');
        // Auto-select default
        if(!selectedAddrId) {
            const def = userAddresses.find(a => a.isDefault);
            if(def) { selectedAddrId = def._id; document.querySelector(`[data-addr-id="${def._id}"]`)?.classList.add('selected'); }
        }
        document.getElementById('btn-to-step3').disabled = !selectedAddrId;
    }

    window.selectAddr = function(id) {
        selectedAddrId = id;
        document.querySelectorAll('.addr-select-card').forEach(c => c.classList.remove('selected'));
        document.querySelector(`[data-addr-id="${id}"]`)?.classList.add('selected');
        document.getElementById('btn-to-step3').disabled = false;
    };

    // Quick add address redirect
    document.getElementById('checkout-add-addr').addEventListener('click', () => {
        window.location.href = 'account.html#addresses';
    });

    // Step 3: Render payment summary
    function renderPaymentSummary() {
        const mini = document.getElementById('pay-items-mini');
        mini.innerHTML = cartItems.map(i => `<img src="${i.imageSrc}" alt="${i.name}" title="${i.name}">`).join('');
        const addr = userAddresses.find(a => a._id === selectedAddrId);
        const addrText = document.getElementById('pay-addr-text');
        if(addr) addrText.innerHTML = `<strong>${addr.fullName}</strong><br>${addr.line1}${addr.line2?', '+addr.line2:''}<br>${addr.city}, ${addr.state} - ${addr.pincode}<br>📞 ${addr.phone}`;
        renderPriceBreakdown();
    }

    // Navigation buttons
    document.getElementById('btn-to-step2').addEventListener('click', () => { loadAddresses(); goToStep(2); });
    document.getElementById('btn-back-1').addEventListener('click', () => goToStep(1));
    document.getElementById('btn-to-step3').addEventListener('click', () => { renderPaymentSummary(); goToStep(3); });
    document.getElementById('btn-back-2').addEventListener('click', () => goToStep(2));

    // PAY NOW
    document.getElementById('btn-pay').addEventListener('click', async () => {
        const btn = document.getElementById('btn-pay');
        btn.disabled = true; btn.textContent = 'Processing...';
        const subtotal = cartItems.reduce((s,i) => s + i.price * i.quantity, 0);
        const delivery = subtotal >= 2000 ? 0 : 99;
        const total = subtotal - couponDiscount + delivery;
        const addr = userAddresses.find(a => a._id === selectedAddrId);

        try {
            const keyRes = await fetch('/api/razorpay-key');
            const keyData = await keyRes.json();

            const orderRes = await fetch('/api/create-order', {
                method:'POST', headers:{'Content-Type':'application/json'},
                body: JSON.stringify({
                    amount: total,
                    items: cartItems.map(i => ({productId:i.id,name:i.name,price:i.price,quantity:i.quantity,imageSrc:i.imageSrc})),
                    customerDetails: { name:addr?.fullName||userName, email:localStorage.getItem('userEmail')||'', address:`${addr?.line1}, ${addr?.city}, ${addr?.state} - ${addr?.pincode}`, phone:addr?.phone||'' },
                    couponUsed: couponCode || undefined,
                    discount: couponDiscount || 0
                })
            });
            const order = await orderRes.json();
            if(order.error) throw new Error(order.error);

            const rzp = new Razorpay({
                key: keyData.key, amount: order.amount, currency: order.currency,
                name:'VELORÉ', description:'Order Payment', order_id: order.id,
                handler: async (r) => {
                    const v = await fetch('/api/verify-payment', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(r)});
                    const d = await v.json();
                    if(d.success) {
                        localStorage.removeItem('velore_cart');
                        document.getElementById('checkout-page').innerHTML = `<div style="text-align:center;padding:80px 0"><h2 style="color:var(--color-gold);font-size:2rem;margin-bottom:1rem">🎉 Order Placed!</h2><p style="color:var(--color-gray);margin-bottom:2rem">Thank you for shopping with VELORÉ.</p><a href="account.html" style="padding:14px 30px;background:var(--color-gold);color:#000;border-radius:4px;text-decoration:none;font-size:0.85rem;letter-spacing:0.1em;text-transform:uppercase">View Orders</a></div>`;
                    } else { if(window.VeloreToast) VeloreToast.show('Payment verification failed','error'); }
                },
                prefill: { name:addr?.fullName||userName, email:localStorage.getItem('userEmail')||'', contact:addr?.phone||'' },
                theme: { color:'#c9a050' }
            });
            rzp.open();
        } catch(e) { if(window.VeloreToast) VeloreToast.show('Error: '+e.message,'error'); else alert('Error: '+e.message); }
        finally { btn.disabled = false; btn.textContent = 'Pay Now →'; }
    });

    // Init
    renderSummary();

    // Handle hash for tab navigation from account page
    if(window.location.hash === '#addresses') {
        // Already on checkout, do nothing
    }
});
