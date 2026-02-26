// Cart — localStorage-based cart for Wanderer shop
(function() {
  const CART_KEY = 'wanderer_cart';

  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch { return []; }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartBadge();
  }

  function addToCart(id, name, price, image) {
    const cart = getCart();
    const existing = cart.find(item => item.id === id);
    if (existing) {
      existing.quantity++;
    } else {
      cart.push({ id, name, price: Number(price), image, quantity: 1 });
    }
    saveCart(cart);
  }

  function removeFromCart(id) {
    const cart = getCart().filter(item => item.id !== id);
    saveCart(cart);
  }

  function updateQuantity(id, qty) {
    const cart = getCart();
    const item = cart.find(i => i.id === id);
    if (item) {
      item.quantity = Math.max(1, Math.min(99, parseInt(qty) || 1));
    }
    saveCart(cart);
  }

  function getCartTotal() {
    return getCart().reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  function getCartCount() {
    return getCart().reduce((sum, item) => sum + item.quantity, 0);
  }

  // Update cart badge in nav
  window.updateCartBadge = function() {
    const badges = document.querySelectorAll('.cart-badge');
    const count = getCartCount();
    badges.forEach(badge => {
      badge.textContent = count;
      badge.style.display = count > 0 ? '' : 'none';
    });
  };

  // Render cart page items
  function renderCartPage() {
    const tbody = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');
    const emptyEl = document.getElementById('cart-empty');
    const contentEl = document.getElementById('cart-content');
    if (!tbody) return;

    const cart = getCart();
    if (cart.length === 0) {
      emptyEl.style.display = '';
      contentEl.style.display = 'none';
      return;
    }

    emptyEl.style.display = 'none';
    contentEl.style.display = '';

    tbody.innerHTML = cart.map(item => `
      <tr>
        <td>${item.image ? `<img src="${item.image}" alt="" style="width:60px;height:60px;object-fit:cover;border-radius:var(--radius);">` : ''}</td>
        <td>${item.name}</td>
        <td>&#8382;${item.price}</td>
        <td>
          <input type="number" class="cart-qty-input" value="${item.quantity}" min="1" max="99" data-id="${item.id}">
        </td>
        <td>&#8382;${(item.price * item.quantity).toFixed(2)}</td>
        <td>
          <button class="btn btn-danger btn-sm cart-remove-btn" data-id="${item.id}">&times;</button>
        </td>
      </tr>
    `).join('');

    totalEl.textContent = `\u20BE${getCartTotal().toFixed(2)}`;

    // Bind quantity inputs
    tbody.querySelectorAll('.cart-qty-input').forEach(input => {
      input.addEventListener('change', function() {
        updateQuantity(this.dataset.id, this.value);
        renderCartPage();
      });
    });

    // Bind remove buttons
    tbody.querySelectorAll('.cart-remove-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        removeFromCart(this.dataset.id);
        renderCartPage();
      });
    });
  }

  // Render checkout summary
  function renderCheckoutPage() {
    const summaryEl = document.getElementById('checkout-summary-items');
    const totalEl = document.getElementById('checkout-total');
    const itemsInput = document.getElementById('checkout-items');
    const formEl = document.getElementById('checkout-form');
    const emptyEl = document.getElementById('checkout-empty');
    if (!summaryEl) return;

    const cart = getCart();
    if (cart.length === 0) {
      if (emptyEl) emptyEl.style.display = '';
      if (formEl) formEl.style.display = 'none';
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    if (formEl) formEl.style.display = '';

    summaryEl.innerHTML = cart.map(item => `
      <div class="checkout-summary-item">
        <span>${item.name} &times; ${item.quantity}</span>
        <span>&#8382;${(item.price * item.quantity).toFixed(2)}</span>
      </div>
    `).join('');

    totalEl.textContent = `\u20BE${getCartTotal().toFixed(2)}`;
    itemsInput.value = JSON.stringify(cart.map(i => ({ id: i.id, quantity: i.quantity })));
  }

  // Init
  document.addEventListener('DOMContentLoaded', function() {
    updateCartBadge();

    // "Add to cart" buttons
    document.addEventListener('click', function(e) {
      const btn = e.target.closest('.btn-add-cart');
      if (!btn) return;
      e.preventDefault();
      const { productId, productName, productPrice, productImage } = btn.dataset;
      addToCart(productId, productName, productPrice, productImage);

      // Brief visual feedback
      const orig = btn.innerHTML;
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Added!';
      btn.disabled = true;
      setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; }, 1200);
    });

    // Render if on cart or checkout page
    renderCartPage();
    renderCheckoutPage();
  });
})();
