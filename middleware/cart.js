// middleware/cart.js – Cart helper functions with proper ID comparison

// Get cart from session (initialize if empty)
function getCart(session) {
  if (!session.cart) {
    session.cart = { items: [], totalQty: 0, totalPrice: 0 };
  }
  return session.cart;
}

// Add item to cart
function addToCart(session, dish, qty = 1) {
  const cart = getCart(session);
  // Compare using string conversion to avoid type issues
  const existingItem = cart.items.find(item => item.dishId.toString() === dish._id.toString());

  if (existingItem) {
    existingItem.qty += qty;
    existingItem.totalPrice = existingItem.qty * existingItem.price;
  } else {
    cart.items.push({
      dishId: dish._id.toString(), // store as string for consistency
      name: dish.name,
      nameAm: dish.nameAm,
      price: dish.price,
      qty: qty,
      totalPrice: dish.price * qty,
      imageUrl: dish.imageUrl
    });
  }

  // Recalculate totals
  cart.totalQty = cart.items.reduce((sum, item) => sum + item.qty, 0);
  cart.totalPrice = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
  return cart;
}

// Remove item from cart
function removeFromCart(session, dishId) {
  const cart = getCart(session);
  cart.items = cart.items.filter(item => item.dishId.toString() !== dishId.toString());
  cart.totalQty = cart.items.reduce((sum, item) => sum + item.qty, 0);
  cart.totalPrice = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
  return cart;
}

// Update item quantity
function updateCartItem(session, dishId, qty) {
  const cart = getCart(session);
  const item = cart.items.find(item => item.dishId.toString() === dishId.toString());
  if (item) {
    item.qty = qty;
    item.totalPrice = item.price * qty;
  }
  cart.totalQty = cart.items.reduce((sum, item) => sum + item.qty, 0);
  cart.totalPrice = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
  return cart;
}

// Clear cart
function clearCart(session) {
  session.cart = { items: [], totalQty: 0, totalPrice: 0 };
  return session.cart;
}

module.exports = {
  getCart,
  addToCart,
  removeFromCart,
  updateCartItem,
  clearCart
};