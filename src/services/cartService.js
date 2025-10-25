const Cart = require('../models/cart');
const CartItem = require('../models/cartItem');
const { getProduct } = require('../services/adminProductService'); 

async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ userId, isActive: true });
  if (!cart) cart = await Cart.create({ userId });
  return cart;
}

/**
 * List cart items and compute total amount
 * @returns {{ cart: Document, total: number }}
 */
async function listCart(userId) {
  const cart = await getOrCreateCart(userId);
  if (!cart) throw new Error('Cart not found');

  await cart.populate('items');

  const items = Array.isArray(cart.items) ? cart.items : [];

  const productIds = [...new Set(items.map(i => i.productId).filter(Boolean))];
  const productMap = new Map();

  await Promise.all(productIds.map(async (id) => {
    try {
      const raw = await getProduct(id);          
      const p = raw?.data ?? raw;               
      productMap.set(id, p || null);
    } catch {
      productMap.set(id, null);
    }
  }));

  let total = 0;
  for (const item of items) {
    const unit = Number(item.price);
    const qty  = Number(item.quantity);
    const subtotal = (Number.isFinite(unit) ? unit : 0) * (Number.isFinite(qty) ? qty : 0);
    total += subtotal;

    const p = productMap.get(item.productId) || null;

    item.set('subtotal', subtotal, { strict: false });
    item.set('product', p ? {
      _id: p._id,
      title: p.title,
      sku: p.sku,
      price: p.price,              
      brand: p.brand,
      category_id: p.category_id,
      category: p.category,
      subcategory: p.subcategory,
      imageUrls: p.imageUrls,
      variants: p.variants,
    } : null, { strict: false });
  }

  return { cart, total };
}

/**
 * Add or increment items in the cart
 * Supports batch or single item
 */
async function addItemsToCart(userId, itemsData) {
  const cart = await getOrCreateCart(userId);
  const results = [];

  const productCache = new Map();
  const fetchProduct = async (productId) => {
    if (productCache.has(productId)) return productCache.get(productId);
    const raw = await getProduct(productId);               
    const product = raw?.data ?? raw;                      
    if (!product) throw new Error(`Product ${productId} not found`);
    productCache.set(productId, product);
    return product;
  };

  for (const data of itemsData) {
    const { productId, quantity = 1 } = data;
    if (!productId) throw new Error('productId required');

    const qty = Number.isFinite(+quantity) ? Math.max(1, parseInt(quantity, 10)) : 1;

    const product = await fetchProduct(productId);
    const price = Number(product.price);
    if (!Number.isFinite(price) || price < 0) {
      throw new Error(`Invalid price for product ${productId}`);
    }

    const item = await CartItem.findOneAndUpdate(
      { cartId: cart._id, productId },
      {
        $inc: { quantity: qty },
        $set: { price },
        $setOnInsert: { cartId: cart._id, productId },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    results.push({
      ...item,
      subtotal: item.quantity * item.price,
      product: {
        _id: product._id,
        title: product.title,
        sku: product.sku,
        price: product.price,
        brand: product.brand,
        category_id: product.category_id,
        category: product.category,
        subcategory: product.subcategory,
        imageUrls: product.imageUrls,
        variants: product.variants,
      },
    });
  }

  return results;
}


async function updateCartItem(userId, itemId, { quantity }) {
  const item = await CartItem.findById(itemId);
  if (!item) throw new Error('CartItem not found');
  const cart = await Cart.findById(item.cartId);
  if (cart.userId !== userId) throw new Error('Forbidden');
  if (quantity <= 0) {
    await item.deleteOne();
    return null;
  }
  item.quantity = quantity;
  await item.save();
  return item;
}

async function removeCartItem(userId, itemId) {
  return updateCartItem(userId, itemId, { quantity: 0 });
}

async function clearCart(userId) {
  const cart = await getOrCreateCart(userId);
  await CartItem.deleteMany({ cartId: cart._id });
}

async function reduceCartItem(userId, itemId, decrement = 1) {
  const item = await CartItem.findById(itemId);
  if (!item) throw new Error('CartItem not found');

  const cart = await Cart.findById(item.cartId);
  if (cart.userId !== userId) throw new Error('Forbidden');

  const newQuantity = item.quantity - decrement;
  return updateCartItem(userId, itemId, { quantity: newQuantity });
}

async function getCartItemCount(userId) {
  const cart = await getOrCreateCart(userId); 
  const [row] = await CartItem.aggregate([
    { $match: { cartId: cart._id } },
    { $group: { _id: null, total: { $sum: { $ifNull: ['$quantity', 0] } } } },
    { $project: { _id: 0, total: 1 } }
  ]);
  return row?.total ?? 0;
}

module.exports = {
  listCart,
  addItemsToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  reduceCartItem,
  getCartItemCount
};