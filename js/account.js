// VELORÉ — Account Page Logic
document.addEventListener('DOMContentLoaded', async () => {
    const toggle = document.getElementById('nav-toggle');
    if(toggle) toggle.addEventListener('click', () => { document.getElementById('nav-links').classList.toggle('open'); toggle.classList.toggle('active'); });

    const token = localStorage.getItem('token');
    if (!token) {
        document.getElementById('account-page').style.display = 'none';
        document.getElementById('not-logged-in').style.display = 'block';
        return;
    }

    const authBtn = document.getElementById('nav-auth-btn');
    const userName = localStorage.getItem('userName');
    if (userName && authBtn) { authBtn.innerText = `Hi, ${userName}`; authBtn.href = 'account.html'; }

    const headers = { Authorization: `Bearer ${token}` };
    const jsonHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
    let userData = null;

    // Load profile
    try {
        const res = await fetch('/api/auth/me', { headers });
        if (res.ok) {
            userData = await res.json();
            document.getElementById('account-greeting').textContent = `Welcome, ${userData.name}`;
            document.getElementById('account-email').textContent = userData.email;
            document.getElementById('user-avatar').textContent = userData.name.charAt(0).toUpperCase();
            document.getElementById('p-name').value = userData.name;
            document.getElementById('p-email').value = userData.email;
            document.getElementById('p-mobile').value = userData.mobile || '';
            document.getElementById('p-altphone').value = userData.alternatePhone || '';
            document.getElementById('p-gender').value = userData.gender || '';
            document.getElementById('p-dob').value = userData.dateOfBirth || '';
            document.getElementById('p-since').value = new Date(userData.createdAt).toLocaleDateString('en-IN', { year:'numeric', month:'long', day:'numeric' });
            renderAddresses(userData.addresses || []);
        }
    } catch(e) { console.error(e); }

    // Save profile
    document.getElementById('profile-save-btn').addEventListener('click', async () => {
        const btn = document.getElementById('profile-save-btn');
        btn.disabled = true; btn.textContent = 'Saving...';
        try {
            const res = await fetch('/api/auth/profile', {
                method: 'PUT', headers: jsonHeaders,
                body: JSON.stringify({
                    name: document.getElementById('p-name').value,
                    mobile: document.getElementById('p-mobile').value,
                    alternatePhone: document.getElementById('p-altphone').value,
                    gender: document.getElementById('p-gender').value,
                    dateOfBirth: document.getElementById('p-dob').value
                })
            });
            if (res.ok) {
                const u = await res.json();
                localStorage.setItem('userName', u.name);
                if (window.VeloreToast) VeloreToast.show('Profile updated!', 'success');
                document.getElementById('account-greeting').textContent = `Welcome, ${u.name}`;
                document.getElementById('user-avatar').textContent = u.name.charAt(0).toUpperCase();
            } else { const d = await res.json(); throw new Error(d.error); }
        } catch(e) { if (window.VeloreToast) VeloreToast.show(e.message || 'Failed to save', 'error'); }
        finally { btn.disabled = false; btn.textContent = 'Save Changes'; }
    });

    // Orders
    try {
        const res = await fetch('/api/auth/orders', { headers });
        const orders = await res.json();
        const container = document.getElementById('orders-list');
        if (!orders.length) {
            container.innerHTML = '<div class="empty-state"><h3>No orders yet</h3><p>Start shopping to see your orders here.</p><a href="shop.html">Browse Shop</a></div>';
        } else {
            container.innerHTML = orders.map(o => {
                const statuses = ['created','paid','processing','shipped','delivered'];
                const currentIdx = statuses.indexOf(o.status);
                const trackHTML = statuses.map((s,i) => `<div class="track-step ${i<currentIdx?'done':''} ${i===currentIdx?'current':''}"><div class="track-line"></div><div class="track-dot"></div><div class="track-label">${s}</div></div>`).join('');
                return `<div class="order-card">
                    <div class="order-header">
                        <div><span class="order-id">Order #${o._id.slice(-8).toUpperCase()}</span></div>
                        <span class="order-date">${new Date(o.createdAt).toLocaleDateString('en-IN',{year:'numeric',month:'short',day:'numeric'})}</span>
                        <span class="order-status status-${o.status}">${o.status}</span>
                    </div>
                    <div class="order-items">${o.items.map(item=>`<div class="order-item"><img src="${item.imageSrc}" alt="${item.name}"><div><p class="order-item-name">${item.name}</p><p class="order-item-qty">Qty: ${item.quantity}</p></div></div>`).join('')}</div>
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span class="order-amount">₹${o.amount?.toLocaleString()}</span>
                        ${o.couponUsed ? `<span style="font-size:0.75rem;color:var(--color-gold);">Coupon: ${o.couponUsed} (-₹${o.discount})</span>` : ''}
                    </div>
                    <div class="tracking-bar">${trackHTML}</div>
                </div>`;
            }).join('');
        }
    } catch(e) { console.error(e); }

    // Wishlist
    function renderWishlist() {
        const list = window.VeloreWishlist ? VeloreWishlist.get() : [];
        const grid = document.getElementById('wishlist-grid');
        if (!list.length) {
            grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><h3>Your wishlist is empty</h3><p>Save products you love by clicking the ♡ icon.</p><a href="shop.html">Browse Shop</a></div>';
            return;
        }
        grid.innerHTML = list.map(p => `
            <div class="wishlist-item" onclick="window.location.href='product.html?id=${p.id}'">
                <img src="${p.imageSrc}" alt="${p.name}">
                <div class="wishlist-item-body">
                    <p class="wishlist-item-name">${p.name}</p>
                    <p class="wishlist-item-price">₹${p.price?.toLocaleString()}</p>
                    <div class="wishlist-actions">
                        <button class="wl-cart-btn" onclick="event.stopPropagation();VeloreCart.add({id:'${p.id}',name:'${p.name.replace(/'/g,"\\'")}',price:${p.price},imageSrc:'${p.imageSrc}',quantity:1});VeloreToast.show('Added to cart','cart')">Add to Cart</button>
                        <button class="wl-remove-btn" onclick="event.stopPropagation();VeloreWishlist.remove('${p.id}');renderWishlist();">Remove</button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    renderWishlist();
    window.renderWishlist = renderWishlist;

    // Addresses
    function renderAddresses(addresses) {
        const grid = document.getElementById('addr-grid');
        if (!addresses.length) {
            grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><h3>No saved addresses</h3><p>Add an address for faster checkout.</p></div>';
            return;
        }
        grid.innerHTML = addresses.map(a => `
            <div class="addr-card ${a.isDefault?'default':''}">
                <div class="addr-label">${a.label||'Home'} ${a.isDefault?'<span class="addr-default-badge">Default</span>':''}</div>
                <p class="addr-name">${a.fullName||''}</p>
                <p class="addr-text">${a.line1||''}${a.line2?', '+a.line2:''}${a.landmark?', Near '+a.landmark:''}</p>
                <p class="addr-text">${a.city||''}, ${a.state||''} - ${a.pincode||''}</p>
                <p class="addr-phone">📞 ${a.phone||''}</p>
                <div class="addr-actions">
                    <button class="addr-edit" onclick="editAddress('${a._id}')">Edit</button>
                    <button class="addr-delete" onclick="deleteAddress('${a._id}')">Delete</button>
                    ${!a.isDefault ? `<button class="addr-set-default" onclick="setDefault('${a._id}')">Set Default</button>` : ''}
                </div>
            </div>
        `).join('');
    }

    // Address form
    const overlay = document.getElementById('addr-form-overlay');
    document.getElementById('addr-add-btn').addEventListener('click', () => {
        document.getElementById('addr-form-title').textContent = 'Add New Address';
        document.getElementById('addr-edit-id').value = '';
        ['af-name','af-line1','af-line2','af-landmark','af-city','af-pincode','af-phone'].forEach(id => document.getElementById(id).value = '');
        document.getElementById('af-label').value = 'Home';
        document.getElementById('af-state').value = '';
        document.getElementById('af-default').checked = false;
        overlay.classList.add('active');
    });
    document.getElementById('addr-form-close').addEventListener('click', () => overlay.classList.remove('active'));
    document.getElementById('addr-cancel-btn').addEventListener('click', () => overlay.classList.remove('active'));
    overlay.addEventListener('click', e => { if(e.target === overlay) overlay.classList.remove('active'); });

    document.getElementById('addr-save-btn').addEventListener('click', async () => {
        const line1 = document.getElementById('af-line1').value;
        const city = document.getElementById('af-city').value;
        const state = document.getElementById('af-state').value;
        const pincode = document.getElementById('af-pincode').value;
        const phone = document.getElementById('af-phone').value;
        if (!line1||!city||!state||!pincode||!phone) { VeloreToast.show('Fill all required fields','error'); return; }

        const body = {
            label: document.getElementById('af-label').value,
            fullName: document.getElementById('af-name').value,
            line1, line2: document.getElementById('af-line2').value,
            landmark: document.getElementById('af-landmark').value,
            city, state, pincode, phone,
            isDefault: document.getElementById('af-default').checked
        };
        const editId = document.getElementById('addr-edit-id').value;
        const btn = document.getElementById('addr-save-btn');
        btn.disabled = true; btn.textContent = 'Saving...';
        try {
            const url = editId ? `/api/auth/address/${editId}` : '/api/auth/address';
            const method = editId ? 'PUT' : 'POST';
            const res = await fetch(url, { method, headers: jsonHeaders, body: JSON.stringify(body) });
            if (res.ok) {
                const addresses = await res.json();
                renderAddresses(addresses);
                overlay.classList.remove('active');
                VeloreToast.show(editId ? 'Address updated!' : 'Address added!', 'success');
            } else { const d = await res.json(); throw new Error(d.error); }
        } catch(e) { VeloreToast.show(e.message||'Failed','error'); }
        finally { btn.disabled = false; btn.textContent = 'Save Address'; }
    });

    window.editAddress = function(id) {
        if (!userData) return;
        const a = userData.addresses.find(x => x._id === id);
        if (!a) return;
        document.getElementById('addr-form-title').textContent = 'Edit Address';
        document.getElementById('addr-edit-id').value = id;
        document.getElementById('af-label').value = a.label || 'Home';
        document.getElementById('af-name').value = a.fullName || '';
        document.getElementById('af-line1').value = a.line1 || '';
        document.getElementById('af-line2').value = a.line2 || '';
        document.getElementById('af-landmark').value = a.landmark || '';
        document.getElementById('af-city').value = a.city || '';
        document.getElementById('af-state').value = a.state || '';
        document.getElementById('af-pincode').value = a.pincode || '';
        document.getElementById('af-phone').value = a.phone || '';
        document.getElementById('af-default').checked = a.isDefault || false;
        overlay.classList.add('active');
    };

    window.deleteAddress = async function(id) {
        showConfirmModal(
            'Delete Address',
            'Are you sure you want to remove this saved address?',
            'Delete',
            async () => {
                try {
                    const res = await fetch(`/api/auth/address/${id}`, { method:'DELETE', headers });
                    if (res.ok) { const a = await res.json(); renderAddresses(a); userData.addresses = a; VeloreToast.show('Address deleted','success'); }
                } catch(e) { VeloreToast.show('Failed to delete','error'); }
            },
            '#ff6b6b'
        );
    };

    window.setDefault = async function(id) {
        try {
            const res = await fetch(`/api/auth/address/${id}/default`, { method:'PUT', headers });
            if (res.ok) { const a = await res.json(); renderAddresses(a); userData.addresses = a; VeloreToast.show('Default address updated','success'); }
        } catch(e) { VeloreToast.show('Failed','error'); }
    };

    // Sign out
    document.getElementById('signout-btn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'index.html';
    });

    // Tab switching
    document.querySelectorAll('.account-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.account-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
        });
    });
});
