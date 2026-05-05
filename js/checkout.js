// Checkout & Razorpay Integration

document.addEventListener('DOMContentLoaded', () => {
    const buyButtons = document.querySelectorAll('.buy-btn');

    buyButtons.forEach((btn, index) => {
        btn.addEventListener('click', async (e) => {
            const card = e.target.closest('.product-card');
            if (!card) return;
            const name = card.querySelector('.product-name').innerText;
            const priceStr = card.querySelector('.product-price').innerText;
            const price = parseInt(priceStr.replace(/[^0-9]/g, '')); // Extract number

            const amountInINR = priceStr.includes('$') ? price * 80 : price;

            btn.disabled = true;
            const origText = btn.textContent;
            btn.textContent = 'Processing...';

            try {
                // Fetch Razorpay key from backend
                const keyRes = await fetch('/api/razorpay-key');
                const keyData = await keyRes.json();

                // 1. Ask backend to create Razorpay Order
                const orderResponse = await fetch('/api/create-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        amount: amountInINR,
                        items: [{ name, price: amountInINR, quantity: 1 }],
                        customerDetails: {
                            name: localStorage.getItem('userName') || "Guest User",
                            email: localStorage.getItem('userEmail') || "guest@example.com",
                            address: "Pending",
                            phone: "Pending"
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
                    key: keyData.key,
                    amount: order.amount,
                    currency: order.currency,
                    name: "VELORÉ",
                    description: "Purchase: " + name,
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
                            if (window.VeloreToast) VeloreToast.show('Payment Successful!', 'success');
                            else alert("Payment Successful! Thank you for your order.");
                        } else {
                            if (window.VeloreToast) VeloreToast.show('Payment Verification Failed!', 'error');
                            else alert("Payment Verification Failed!");
                        }
                    },
                    prefill: {
                        name: localStorage.getItem('userName') || "Guest User",
                        email: localStorage.getItem('userEmail') || "guest@example.com",
                        contact: ""
                    },
                    theme: {
                        color: "#c9a050"
                    }
                };

                const rzp = new Razorpay(options);
                rzp.open();
                
            } catch (err) {
                console.error("Checkout Error:", err);
                if (window.VeloreToast) VeloreToast.show('Checkout error: ' + err.message, 'error');
                else alert("Something went wrong with checkout.");
            } finally {
                btn.disabled = false;
                btn.textContent = origText;
            }
        });
    });
});
