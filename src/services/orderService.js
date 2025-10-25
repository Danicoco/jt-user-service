const Order = require('../models/order');

async function createOrder(userId, receipt) {
  const checkoutRef =
    receipt.checkoutRef ||
    receipt.reference   ||   
    receipt.txRef       ||
    receipt.transactionId;

  if (!checkoutRef) {
    console.error('createOrder missing ref; receipt=', JSON.stringify(receipt));
    throw new Error('Missing checkout reference on receipt');
  }

  const order = await Order.findOneAndUpdate(
    { checkoutRef },
    {
      $setOnInsert: {
        userId,
        items: receipt.items,
        total: receipt.charged,
        status: 'confirmed',
        checkoutRef,
      }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return order;
}

async function listOrders(userId) {
  return Order.find({ userId }).sort({ createdAt: -1 });
}

async function getOrder(userId, orderId) {
  return Order.findOne({ _id: orderId, userId });
}

async function updateOrderStatus(orderId, newStatus) {
  return Order.findByIdAndUpdate(orderId, { status: newStatus }, { new: true });
}


module.exports = { createOrder, listOrders, getOrder, updateOrderStatus };
