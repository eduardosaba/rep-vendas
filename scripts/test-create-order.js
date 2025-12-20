(async () => {
  try {
    const res = await fetch('http://localhost:3000/api/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeOwnerId: 'test-owner',
        customer: { name: 'Test Client', phone: '999' },
        cartItems: [
          {
            id: 'prod1',
            name: 'Product 1',
            reference_code: 'REF1',
            quantity: 2,
            price: 10,
          },
        ],
      }),
    });

    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Body:', text);
  } catch (err) {
    console.error('Request failed:', err);
  }
})();
