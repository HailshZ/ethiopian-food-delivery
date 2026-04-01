// middleware/cart.js – Cart helper functions with ID comparison for Sequelize integer IDs

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
  const dishId = String(dish.id);
  const existingItem = cart.items.find(item => String(item.dishId) === dishId);

  if (existingItem) {
    existingItem.qty += qty;
    existingItem.totalPrice = existingItem.qty * existingItem.price;
  } else {
    cart.items.push({
      dishId: dish.id,
      name: dish.name,
      nameAm: dish.nameAm,
      price: parseFloat(dish.price),
      qty: qty,
      totalPrice: parseFloat(dish.price) * qty,
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
  cart.items = cart.items.filter(item => String(item.dishId) !== String(dishId));
  cart.totalQty = cart.items.reduce((sum, item) => sum + item.qty, 0);
  cart.totalPrice = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
  return cart;
}

// Update item quantity
function updateCartItem(session, dishId, qty) {
  const cart = getCart(session);
  const item = cart.items.find(item => String(item.dishId) === String(dishId));
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