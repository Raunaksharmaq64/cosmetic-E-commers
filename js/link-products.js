// Dynamically link homepage product cards to product.html pages
// Also adds "Add to Cart" + "View Details" functionality
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('/api/products');
        if (!res.ok) return;
        const products = await res.json();

        const cards = document.querySelectorAll('.product-card');
        cards.forEach(card => {
            const nameEl = card.querySelector('.product-name');
            const btnEl = card.querySelector('.buy-btn');

            if (nameEl && btnEl) {
                const productName = nameEl.innerText.trim();
                // Match by name — try exact, then case-insensitive
                let matchedProduct = products.find(p => p.name === productName);
                if (!matchedProduct) {
                    matchedProduct = products.find(p => p.name.toLowerCase() === productName.toLowerCase());
                }

                if (matchedProduct) {
                    // Update price from DB
                    const priceEl = card.querySelector('.product-price');
                    if (priceEl) priceEl.textContent = `₹${matchedProduct.price.toLocaleString()}`;

                    // Make Buy Now navigate to product page (not just add to cart)
                    btnEl.innerText = "Buy Now";
                    btnEl.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.location.href = `product.html?id=${matchedProduct._id}`;
                    });

                    // Make the whole card clickable → product page
                    card.style.cursor = 'pointer';
                    card.addEventListener('click', (e) => {
                        // Don't navigate if they clicked the Buy Now button (handled above)
                        if (e.target.closest('.buy-btn')) return;
                        window.location.href = `product.html?id=${matchedProduct._id}`;
                    });
                } else {
                    // No match found — make Buy Now go to shop page
                    btnEl.addEventListener('click', (e) => {
                        e.preventDefault();
                        window.location.href = 'shop.html';
                    });
                    card.style.cursor = 'pointer';
                    card.addEventListener('click', () => {
                        window.location.href = 'shop.html';
                    });
                }
            }
        });
    } catch(err) {
        console.error("Failed to map products for linking.", err);
    }
});
