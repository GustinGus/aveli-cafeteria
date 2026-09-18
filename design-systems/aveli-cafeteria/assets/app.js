// Avelí Cafeteria — interação (Etapa 4)
// Estado do pedido em memória (válido enquanto a página estiver aberta;
// sem persistência entre sessões nesta etapa).

(function () {
  'use strict';

  var cart = []; // { name, milk, unitPrice, qty }

  var modal = document.getElementById('product-modal');
  var modalTitle = document.getElementById('modal-title');
  var modalDesc = document.getElementById('modal-desc');
  var modalPrice = document.getElementById('modal-price');
  var modalQty = document.getElementById('modal-qty');
  var modalMilkOptions = document.getElementById('modal-milk-options');
  var modalAddBtn = document.getElementById('modal-add-btn');
  var modalPhoto = document.getElementById('modal-photo');
  var modalPhotoFallback = document.getElementById('modal-photo-fallback');

  var cartPanel = document.getElementById('cart-panel');
  var cartItemsEl = document.getElementById('cart-items');
  var cartTotalEl = document.getElementById('cart-total');
  var cartBadge = document.getElementById('cart-badge');

  var floatcart = document.getElementById('floatcart');
  var floatcartLabel = document.getElementById('floatcart-label');

  var currentProduct = null; // { name, price, desc }
  var currentQty = 1;
  var currentExtra = 0;
  var currentMilkLabel = 'Comum';

  function formatBRL(n) {
    return 'R$ ' + n;
  }

  function parsePrice(text) {
    var digits = (text || '').replace(/[^0-9]/g, '');
    return digits ? parseInt(digits, 10) : 0;
  }

  // ---------- Modal do produto ----------

  function openModal(itemBtn) {
    var nameEl = itemBtn.querySelector('.menu__item-name');
    var priceEl = itemBtn.querySelector('.menu__item-price');
    var descEl = itemBtn.querySelector('.menu__item-desc');

    currentProduct = {
      name: (nameEl && nameEl.textContent.trim()) || 'Produto',
      price: priceEl ? parsePrice(priceEl.textContent) : 0,
      desc: (descEl && descEl.textContent.trim()) || ''
    };
    currentQty = 1;
    currentExtra = 0;
    currentMilkLabel = 'Comum';

    modalTitle.textContent = currentProduct.name;
    modalDesc.textContent = currentProduct.desc;
    modalDesc.hidden = !currentProduct.desc;
    modalQty.textContent = String(currentQty);

    var milkButtons = modalMilkOptions.querySelectorAll('.btn2');
    milkButtons.forEach(function (btn, i) {
      btn.classList.toggle('is-active', i === 0);
    });

    updateModalPrice();
    loadProductPhoto(itemBtn.getAttribute('data-image'));

    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  // Tenta carregar a foto oficial do produto; se o arquivo ainda não
  // existir (404) ou não houver path, mostra o fallback elegante sem
  // nunca deixar um ícone de imagem quebrada aparecer.
  function loadProductPhoto(path) {
    modalPhoto.hidden = true;
    modalPhotoFallback.hidden = false;
    modalPhoto.onload = null;
    modalPhoto.onerror = null;

    if (!path) {
      modalPhoto.removeAttribute('src');
      return;
    }

    modalPhoto.onload = function () {
      modalPhoto.hidden = false;
      modalPhotoFallback.hidden = true;
    };
    modalPhoto.onerror = function () {
      modalPhoto.hidden = true;
      modalPhotoFallback.hidden = false;
    };
    modalPhoto.alt = currentProduct ? currentProduct.name : '';
    modalPhoto.src = path;
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  function updateModalPrice() {
    if (!currentProduct) return;
    modalPrice.textContent = formatBRL(currentProduct.price + currentExtra);
  }

  document.querySelectorAll('.menu__item-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      openModal(btn);
    });
  });

  modalMilkOptions.addEventListener('click', function (e) {
    var btn = e.target.closest('.btn2');
    if (!btn) return;
    modalMilkOptions.querySelectorAll('.btn2').forEach(function (b) {
      b.classList.remove('is-active');
    });
    btn.classList.add('is-active');
    currentExtra = parseInt(btn.getAttribute('data-extra'), 10) || 0;
    currentMilkLabel = btn.textContent.replace(/\s*\(\+\d+\)/, '').trim();
    updateModalPrice();
  });

  document.getElementById('modal-qty-minus').addEventListener('click', function () {
    currentQty = Math.max(1, currentQty - 1);
    modalQty.textContent = String(currentQty);
  });

  document.getElementById('modal-qty-plus').addEventListener('click', function () {
    currentQty += 1;
    modalQty.textContent = String(currentQty);
  });

  modalAddBtn.addEventListener('click', function () {
    if (!currentProduct) return;
    var unitPrice = currentProduct.price + currentExtra;
    var existing = cart.find(function (line) {
      return line.name === currentProduct.name && line.milk === currentMilkLabel;
    });
    if (existing) {
      existing.qty += currentQty;
    } else {
      cart.push({
        name: currentProduct.name,
        milk: currentMilkLabel,
        unitPrice: unitPrice,
        qty: currentQty
      });
    }
    renderCart();
    closeModal();
    openCart();
  });

  // ---------- Carrinho ----------

  function renderCart() {
    cartItemsEl.innerHTML = '';

    if (cart.length === 0) {
      var empty = document.createElement('p');
      empty.className = 't3 cart__empty';
      empty.textContent = 'Seu carrinho está vazio.';
      cartItemsEl.appendChild(empty);
    }

    var total = 0;
    var itemCount = 0;

    cart.forEach(function (line, index) {
      var subtotal = line.unitPrice * line.qty;
      total += subtotal;
      itemCount += line.qty;

      var row = document.createElement('div');
      row.className = 'cart__item';
      row.innerHTML =
        '<div class="cart__item-row">' +
          '<span class="t1"></span>' +
          '<span class="t2"></span>' +
        '</div>' +
        (line.milk !== 'Comum' ? '<span class="t3"></span>' : '') +
        '<div class="cart__item-controls">' +
          '<div class="cart__stepper">' +
            '<button class="cart__stepper-btn" type="button" data-action="dec" aria-label="Diminuir quantidade"><svg class="icon"><use href="#icon-minus"></use></svg></button>' +
            '<span class="t1"></span>' +
            '<button class="cart__stepper-btn" type="button" data-action="inc" aria-label="Aumentar quantidade"><svg class="icon"><use href="#icon-plus"></use></svg></button>' +
          '</div>' +
          '<button class="btn3 cart__remove" type="button" data-action="remove">Remover</button>' +
        '</div>';

      row.querySelectorAll('.t1')[0].textContent = line.name;
      row.querySelector('.t2').textContent = formatBRL(subtotal);
      if (line.milk !== 'Comum') {
        row.querySelector('.t3').textContent = line.milk;
      }
      row.querySelectorAll('.t1')[1].textContent = String(line.qty);

      row.querySelector('[data-action="dec"]').addEventListener('click', function () {
        line.qty -= 1;
        if (line.qty <= 0) {
          cart.splice(index, 1);
        }
        renderCart();
      });
      row.querySelector('[data-action="inc"]').addEventListener('click', function () {
        line.qty += 1;
        renderCart();
      });
      row.querySelector('[data-action="remove"]').addEventListener('click', function () {
        cart.splice(index, 1);
        renderCart();
      });

      cartItemsEl.appendChild(row);
    });

    cartTotalEl.textContent = formatBRL(total);
    cartBadge.textContent = String(itemCount);
    floatcartLabel.textContent = 'VER PEDIDO • ' + itemCount + (itemCount === 1 ? ' ITEM' : ' ITENS') + ' • ' + formatBRL(total);
    floatcart.classList.toggle('is-visible', itemCount > 0);
  }

  document.getElementById('cart-clear-btn').addEventListener('click', function () {
    if (cart.length === 0) return;
    if (window.confirm('Limpar todos os itens do carrinho?')) {
      cart = [];
      renderCart();
    }
  });

  function openCart() {
    cartPanel.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    cartPanel.hidden = true;
    document.body.style.overflow = '';
  }

  document.getElementById('header-cart-btn').addEventListener('click', openCart);
  document.getElementById('floatcart-btn').addEventListener('click', openCart);

  document.querySelectorAll('[data-close="modal"]').forEach(function (el) {
    el.addEventListener('click', closeModal);
  });
  document.querySelectorAll('[data-close="cart"]').forEach(function (el) {
    el.addEventListener('click', closeCart);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!modal.hidden) closeModal();
    if (!cartPanel.hidden) closeCart();
  });

  // ---------- Nav ativo por categoria (scroll) ----------

  var categoryIds = ['cat-cafe', 'cat-comleite', 'cat-filtrados', 'cat-gelado', 'cat-saborear', 'cat-adocar'];
  var navLinks = document.querySelectorAll('.header__nav a, .catnav a');

  function setActiveCategory(id) {
    navLinks.forEach(function (link) {
      var isMatch = link.getAttribute('href') === '#' + id;
      link.classList.toggle('is-active', isMatch);
    });
  }

  if ('IntersectionObserver' in window) {
    // Zona de ativação logo abaixo do header sticky (padrão "scrollspy"),
    // não no meio da viewport — evita que a primeira categoria (curta)
    // seja ignorada em favor da seguinte.
    var headerHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height'), 10) || 60;
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            setActiveCategory(entry.target.id);
          }
        });
      },
      { rootMargin: '-' + (headerHeight + 8) + 'px 0px -80% 0px' }
    );

    categoryIds.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) observer.observe(el);
    });
  }

  renderCart();
})();
