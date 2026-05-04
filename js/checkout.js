// Checkout & Razorpay Integration

document.addEventListener('DOMContentLoaded', () => {
    const buyButtons = document.querySelectorAll('.buy-btn');

    buyButtons.forEach((btn, index) => {
        btn.addEventListener('click', async (e) => {
            const card = e.target.closest('.product-card');
            const name = card.querySelector('.product-name').innerText;
            const priceStr = card.querySelector('.product-price').innerText;
            const price = parseInt(priceStr.replace(/[^0-9]/g, '')); // Extract number

            // Convert static $ price to INR for demo if needed, but assuming DB will handle it.
            // Since cards are static, we'll just multiply by 80 for INR if it's currently $.
            // Actually, let's update index.html to show ₹ directly later, but for now:
            const amountInINR = priceStr.includes('$') ? price * 80 : price;

            try {
                // 1. Ask backend to create Razorpay Order
                const orderResponse = await fetch('/api/create-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        amount: amountInINR,
                        items: [{ name, price: amountInINR, quantity: 1 }],
                        customerDetails: {
                            name: "Guest User",
                            email: "guest@example.com",
                            address: "123 Street, City",
                            phone: "9999999999"
                        }
                    })
                });

                const order = await orderResponse.json();

                if (order.error) {
                    alert('Error creating order: ' + order.error);
                    return;
                }

                // 2. Open Razorpay Checkout Modal
                const options = {
                    key: "your_razorpay_key_id", // Replace with your actual key or fetch from backend
                    amount: order.amount,
                    currency: order.currency,
                    name: "VELORÉ",
                    description: "Test Transaction for " + name,
                    order_id: order.id,
                    handler: async function (response) {
                        // 3. Verify Payment
                        const verifyRes = await fetch('/api/verify-payment', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature
                            })
                        });
                        const verifyData = await verifyRes.json();
                        if (verifyData.success) {
                            alert("Payment Successful! Thank you for your order.");
                        } else {
                            alert("Payment Verification Failed!");
                        }
                    },
                    prefill: {
                        name: "Guest User",
                        email: "guest@example.com",
                        contact: "9999999999"
                    },
                    theme: {
                        color: "#c9a050" // Match brand gold
                    }
                };

                const rzp = new Razorpay(options);
                rzp.open();
                
            } catch (err) {
                console.error("Checkout Error:", err);
                alert("Something went wrong with checkout.");
            }
        });
    });
});
