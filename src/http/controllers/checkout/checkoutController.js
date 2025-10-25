const { jsonS, jsonFailed } = require("../../../utils");
const { checkout } = require("../../../services/checkoutService");
const { sendOrderConfirmation } = require("../../../services/emailNotification");
const { getUserById } = require("../../../services/userService");
const { formatUserName } = require("../../../utils/stringUtils");

const Controller = {
  checkout: async (req, res) => {
    const { pin } = req.body;
    if (!pin) return jsonFailed(res, {}, 'PIN is required', 400);

    try {
      const userId = req.user.id;
      const user = await getUserById(userId);

      // Optional, recommended for idempotency:
      const idempotencyKey = req.get('Idempotency-Key');

      // checkout() should: charge wallet, create order idempotently, clear cart,
      // and auto-refund on failures after debit.
      const receipt = await checkout(userId, pin, /* deliveryFee */ 0, idempotencyKey);

      const customerName  = formatUserName(user);
      const customerEmail = user.email;

      // fire-and-forget email
      sendOrderConfirmation(customerEmail, customerName, {
        orderId:     receipt.orderId,
        items:       receipt.items,
        totalAmount: receipt.totalAmount,
      }).catch(err => console.error('Email failed:', err));

      return jsonS(res, 200, 'Checkout successful', {
        orderId:          receipt.orderId,
        reference:        receipt.reference,
        items:            receipt.items,
        charged:          receipt.charged,
        remainingBalance: receipt.remainingBalance,
        timestamp:        receipt.timestamp,
      });
    } catch (err) {
      console.error('checkout error:', err);

      // Map known errors to appropriate status/messages
      const msg = err?.message || '';
      let statusCode = 500;
      let clientMsg  = 'Checkout failed';

      if (msg === 'Invalid PIN') {
        statusCode = 401; clientMsg = msg;
      } else if (msg === 'Cart is empty') {
        statusCode = 400; clientMsg = 'Your cart is empty';
      } else if (msg === 'Insufficient wallet balance') {
        statusCode = 400; clientMsg = msg;
      }

      return jsonFailed(res, {}, clientMsg, statusCode);
    }
  },
};

module.exports = Controller;