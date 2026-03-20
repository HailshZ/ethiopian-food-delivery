// ================================================
// EthioFood Delivery – Main JavaScript (AJAX + UX)
// ================================================

// ---- Toast Notification System ----
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
        success: 'bi-check-circle-fill',
        error: 'bi-exclamation-triangle-fill',
        info: 'bi-info-circle-fill'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-custom ${type} show`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
    <div class="toast-body d-flex align-items-center gap-2 py-3 px-4">
      <i class="bi ${icons[type] || icons.info}" style="font-size:1.2rem;"></i>
      <span class="flex-grow-1">${message}</span>
      <button type="button" class="btn-close btn-close-white ms-2" onclick="this.closest('.toast').remove()"></button>
    </div>
  `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('animate__animated', 'animate__fadeOutRight');
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

// ---- Update Cart Badge ----
function updateCartBadge(cart) {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    if (cart && cart.totalQty > 0) {
        badge.textContent = cart.totalQty;
        badge.classList.remove('d-none');
        badge.classList.add('animate__animated', 'animate__bounceIn');
        setTimeout(() => badge.classList.remove('animate__animated', 'animate__bounceIn'), 600);
    } else {
        badge.classList.add('d-none');
    }
}

// ---- AJAX Add to Cart ----
document.addEventListener('click', async function (e) {
    const btn = e.target.closest('.ajax-add-cart');
    if (!btn) return;

    e.preventDefault();
    const dishId = btn.dataset.dishId;
    const originalHtml = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

    try {
        const res = await fetch(`/api/cart/add/${dishId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ qty: 1 })
        });
        const data = await res.json();

        if (data.success) {
            updateCartBadge(data.cart);
            showToast('Added to cart!', 'success');
            btn.innerHTML = '<i class="bi bi-check-lg me-1"></i> Added!';
            setTimeout(() => { btn.innerHTML = originalHtml; btn.disabled = false; }, 1500);
        } else {
            throw new Error(data.error || 'Failed');
        }
    } catch (err) {
        showToast(err.message || 'Error adding to cart', 'error');
        btn.innerHTML = originalHtml;
        btn.disabled = false;
    }
});

// ---- AJAX Cart Update Quantity ----
async function updateCartQty(dishId, newQty) {
    if (newQty < 1) {
        removeCartItem(dishId);
        return;
    }

    try {
        const res = await fetch(`/api/cart/update/${dishId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ qty: newQty })
        });
        const data = await res.json();

        if (data.success) {
            updateCartBadge(data.cart);
            // Reload to update cart display
            window.location.reload();
        }
    } catch (err) {
        showToast('Error updating quantity', 'error');
    }
}

// ---- AJAX Cart Remove Item ----
async function removeCartItem(dishId) {
    try {
        const res = await fetch(`/api/cart/remove/${dishId}`, { method: 'DELETE' });
        const data = await res.json();

        if (data.success) {
            updateCartBadge(data.cart);
            // Animate removal
            const item = document.querySelector(`.cart-item[data-dish-id="${dishId}"]`);
            if (item) {
                item.style.transition = 'all 0.3s ease';
                item.style.opacity = '0';
                item.style.transform = 'translateX(50px)';
                setTimeout(() => {
                    item.remove();
                    window.location.reload();
                }, 300);
            } else {
                window.location.reload();
            }
            showToast('Item removed from cart', 'info');
        }
    } catch (err) {
        showToast('Error removing item', 'error');
    }
}

// ---- Menu Search (AJAX) ----
const searchInput = document.getElementById('menu-search');
if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', function () {
        clearTimeout(searchTimeout);
        const query = this.value.toLowerCase().trim();
        searchTimeout = setTimeout(() => {
            const items = document.querySelectorAll('.dish-item');
            items.forEach(item => {
                const title = item.querySelector('.dish-card-title');
                const desc = item.querySelector('.dish-card-desc');
                const text = (title ? title.textContent : '') + ' ' + (desc ? desc.textContent : '');
                item.style.display = text.toLowerCase().includes(query) || !query ? '' : 'none';
            });
        }, 200);
    });
}

// ---- Menu Category Filter ----
document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', function () {
        document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        this.classList.add('active');

        const category = this.dataset.category;
        document.querySelectorAll('.dish-item').forEach(item => {
            if (category === 'all' || item.dataset.category === category) {
                item.style.display = '';
                item.style.animation = 'fadeInUp 0.4s ease';
            } else {
                item.style.display = 'none';
            }
        });
    });
});

// ---- Header Scroll Effect ----
window.addEventListener('scroll', function () {
    const header = document.getElementById('main-header');
    if (header) {
        if (window.scrollY > 50) {
            header.style.boxShadow = '0 4px 30px rgba(0,0,0,0.2)';
        } else {
            header.style.boxShadow = '0 4px 20px rgba(7,137,48,0.3)';
        }
    }
});

// ---- Auto-dismiss flash messages ----
document.addEventListener('DOMContentLoaded', function () {
    const alerts = document.querySelectorAll('#flash-container .alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.classList.add('animate__animated', 'animate__fadeOutUp');
            setTimeout(() => alert.remove(), 500);
        }, 4000);
    });
});

// ---- Smooth Scroll for anchor links ----
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// ---- Scroll Reveal Animation (IntersectionObserver) ----
document.addEventListener('DOMContentLoaded', function () {
    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -50px 0px',
        threshold: 0.1
    };

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                revealObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all scroll-reveal elements
    document.querySelectorAll('.scroll-reveal, .stagger-children').forEach(el => {
        revealObserver.observe(el);
    });

    // Auto-add reveal to dish cards and glass cards on page load
    document.querySelectorAll('.dish-card, .glass-card, .order-card').forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, Math.min(index * 80, 800));
    });

    // Enhance category filter pills with ripple effect
    document.querySelectorAll('.filter-pill').forEach(pill => {
        pill.addEventListener('click', function (e) {
            const ripple = document.createElement('span');
            ripple.style.cssText = `
                position: absolute; border-radius: 50%; background: rgba(255,255,255,0.4);
                width: 20px; height: 20px; transform: scale(0); animation: ripple 0.4s ease-out;
                pointer-events: none;
            `;
            const rect = this.getBoundingClientRect();
            ripple.style.left = (e.clientX - rect.left - 10) + 'px';
            ripple.style.top = (e.clientY - rect.top - 10) + 'px';
            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);
            setTimeout(() => ripple.remove(), 400);
        });
    });
});

// ---- Page Transition Effect ----
window.addEventListener('beforeunload', function () {
    document.body.style.transition = 'opacity 0.15s ease';
    document.body.style.opacity = '0.5';
});
