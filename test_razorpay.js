require('dotenv').config();
const Razorpay = require('razorpay');

async function testRazorpay() {
  try {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    console.log('Testing Razorpay with:');
    console.log('Key ID:', key_id ? key_id.substring(0, 5) + '...' : 'MISSING');
    console.log('Key Secret:', key_secret ? 'PRESENT' : 'MISSING');

    if (!key_id || !key_secret) {
      console.error('Missing credentials!');
      return;
    }

    const razorpay = new Razorpay({ key_id, key_secret });

    const orderOptions = {
      amount: 50000, // 500 INR
      currency: 'INR',
      receipt: 'test_receipt_' + Date.now(),
      notes: {
        userId: 'test_user',
        purpose: 'wallet_topup_test',
      },
    };

    console.log('Creating order with options:', orderOptions);

    const order = await razorpay.orders.create(orderOptions);
    console.log('Order created successfully:', order);
  } catch (error) {
    console.error('CAUGHT ERROR:');
    console.error(error);
    if (error.stack) console.error(error.stack);
  }
}

testRazorpay();
