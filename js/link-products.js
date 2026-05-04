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

                    // Change "Buy Now" to "Add to Cart"
                    btnEl.innerText = "Add to Cart";
                    btnEl.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (window.VeloreCart) {
                            window.VeloreCart.add({
                                id: matchedProduct._id,
                                name: matchedProduct.name,
                                price: matchedProduct.price,
                                imageSrc: matchedProduct.imageSrc,
                                quantity: 1
                            });
                            btnEl.textContent = 'Added ✓';
                            btnEl.style.background = 'var(--color-gold)';
                            btnEl.style.color = '#000';
                            btnEl.style.borderColor = 'var(--color-gold)';
                            setTimeout(() => {
                                btnEl.textContent = 'Add to Cart';
                                btnEl.style.background = '';
                                btnEl.style.color = '';
                                btnEl.style.borderColor = '';
                            }, 1800);
                        } else {
                            // Cart not loaded yet — redirect to product page
                            window.location.href = `product.html?id=${matchedProduct._id}`;
                        }
                    });

                    // Clicking the card image/name → product page
                    const imgWrapper = card.querySelector('.product-img-wrapper');
                    const nameLink = card.querySelector('.product-name');
                    if (imgWrapper) {
                        imgWrapper.style.cursor = 'pointer';
                        imgWrapper.addEventListener('click', () => {
                            window.location.href = `product.html?id=${matchedProduct._id}`;
                        });
                    }
                    if (nameLink) {
                        nameLink.style.cursor = 'pointer';
                        nameLink.addEventListener('click', () => {
                            window.location.href = `product.html?id=${matchedProduct._id}`;
                        });
                    }
                } else {
                    // No match found — make Buy Now go to shop page
                    btnEl.addEventListener('click', (e) => {
                        e.preventDefault();
                        window.location.href = 'shop.html';
                    });
                }
            }
        });
    } catch(err) {
        console.error("Failed to map products for linking.", err);
    }
});
