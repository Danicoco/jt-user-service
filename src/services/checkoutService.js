const cartService = require('./cartService');
const { chargeWallet, creditWallet } = require('./walletService'); // ensure creditWallet exists
const { getProduct }   = require('./adminProductService');
const { createOrder }  = require('./orderService');

async function checkout(userId, pin, deliveryFee = 0, idempotencyKey) {
  const { cart, total: itemsTotal } = await cartService.listCart(userId);
  if (itemsTotal <= 0) throw new Error('Cart is empty');

  const amountToCharge = itemsTotal + deliveryFee;

  let charged = false;
  let reference;

  try {
    const walletResp = await chargeWallet(
      { userId, amount: amountToCharge, pin },
      { idempotencyKey } 
    );

    charged = true;
    reference =
      walletResp?.reference ||
      walletResp?.txRef ||
      walletResp?.transactionId ||
      walletResp?.id ||
      idempotencyKey;

    if (!reference) throw new Error('Missing transaction reference from wallet');

    const detailedItems = await Promise.all(
      cart.items.map(async (item) => {
        const prod = await getProduct(item.productId);
        const unitPrice = Number(item.price);
        return {
          productId: item.productId,
          name:      prod.title,
          quantity:  item.quantity,
          unitPrice,
          subtotal:  unitPrice * item.quantity,
        };
      })
    );

    const order = await createOrder(userId, {
      items:      detailedItems,
      deliveryFee,
      charged:    amountToCharge,
      reference,
      checkoutRef: reference,
    });

    await cartService.clearCart(userId);

    return {
      orderId:          order._id,
      reference,
      items:            detailedItems,
      itemsTotal,
      deliveryFee,
      charged:          amountToCharge,
      totalAmount:      amountToCharge,
      remainingBalance: Number(walletResp.balance), 
      timestamp:        new Date(),
    };
  } catch (err) {
    if (charged && reference) {
      try {
        await creditWallet({ userId, amount: amountToCharge, originalRef: reference });
      } catch (refundErr) {
        console.error('checkout.refund_failed', {
          userId,
          amountToCharge,
          reference,
          error: refundErr.message,
          ts: new Date().toISOString(),
        });
      }
    }
    throw err;
  }
}

module.exports = { checkout };
