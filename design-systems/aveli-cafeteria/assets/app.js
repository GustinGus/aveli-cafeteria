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
  var modalKicker = document.getElementById('modal-kicker');
  var modalMeta = document.getElementById('modal-meta');

  var cartPanel = document.getElementById('cart-panel');
  var cartItemsEl = document.getElementById('cart-items');
  var cartTotalEl = document.getElementById('cart-total');
  var cartBadge = document.getElementById('cart-badge');
  var cartCheckoutBtn = document.getElementById('cart-checkout-btn');

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

  // Fonte única do total do pedido — lida direto do array "cart" (o mesmo
  // que o carrinho usa para renderizar). A finalização do pedido reaproveita
  // esta função em vez de recalcular por conta própria.
  function getCartLines() {
    return cart.map(function (line) {
      return {
        name: line.name,
        milk: line.milk,
        qty: line.qty,
        unitPrice: line.unitPrice,
        subtotal: line.unitPrice * line.qty
      };
    });
  }

  function getCartTotal() {
    return getCartLines().reduce(function (sum, line) { return sum + line.subtotal; }, 0);
  }

  // ---------- Modal do produto ----------

  // Volume/subtítulo curto (ex. "30 ml") é uma variação tipográfica do
  // mesmo campo de descrição do cardápio — não um dado novo/duplicado.
  // "300 ml — texto" vira meta="300 ml" + desc="texto"; "30 ml" sozinho
  // vira só meta, sem linha de descrição.
  function splitMeta(desc) {
    var withDash = desc.match(/^(\d+\s*ml)\s*[—-]\s*(.+)$/i);
    if (withDash) {
      return { meta: withDash[1], desc: withDash[2] };
    }
    if (/^\d+\s*ml$/i.test(desc)) {
      return { meta: desc, desc: '' };
    }
    return { meta: '', desc: desc };
  }

  // Categoria/subcategoria vêm da hierarquia do próprio HTML do cardápio
  // (a mesma fonte de verdade), não de um dado duplicado em JS.
  function categoryKicker(itemBtn) {
    var subEl = itemBtn.closest('.menu__subcategory');
    var catEl = itemBtn.closest('.menu__category');
    var catTitle = catEl ? catEl.querySelector('.h2') : null;
    var subTitle = subEl ? subEl.querySelector('.h3') : null;
    var parts = [];
    if (catTitle) parts.push(catTitle.textContent.trim());
    if (subTitle) parts.push(subTitle.textContent.trim());
    return parts.join(' · ');
  }

  function openModal(itemBtn) {
    var nameEl = itemBtn.querySelector('.menu__item-name');
    var priceEl = itemBtn.querySelector('.menu__item-price');
    var descEl = itemBtn.querySelector('.menu__item-desc');
    var rawDesc = (descEl && descEl.textContent.trim()) || '';
    var split = splitMeta(rawDesc);

    currentProduct = {
      name: (nameEl && nameEl.textContent.trim()) || 'Produto',
      price: priceEl ? parsePrice(priceEl.textContent) : 0,
      meta: split.meta,
      desc: split.desc
    };
    currentQty = 1;
    currentExtra = 0;
    currentMilkLabel = 'Comum';

    modalKicker.textContent = categoryKicker(itemBtn);
    modalTitle.textContent = currentProduct.name;
    modalMeta.textContent = currentProduct.meta;
    modalMeta.hidden = !currentProduct.meta;
    modalDesc.textContent = currentProduct.desc;
    modalDesc.hidden = !currentProduct.desc;
    modalQty.textContent = String(currentQty);

    var milkButtons = modalMilkOptions.querySelectorAll('.btn2');
    milkButtons.forEach(function (btn, i) {
      btn.classList.toggle('is-active', i === 0);
    });

    updateModalPrice();

    modal.hidden = false;
    document.body.style.overflow = 'hidden';
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
    cartCheckoutBtn.disabled = cart.length === 0;
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

  // ---------- Carrossel "Um pouco da Avelí" ----------

  (function () {
    var track = document.getElementById('place-track');
    if (!track) return;

    var slides = Array.prototype.slice.call(track.querySelectorAll('.place__slide'));
    var counter = document.getElementById('place-counter');
    var prevBtn = document.getElementById('place-prev');
    var nextBtn = document.getElementById('place-next');
    var total = slides.length;
    var current = 0;
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function pad2(n) {
      return n < 10 ? '0' + n : String(n);
    }

    function updateCounter(index) {
      counter.textContent = pad2(index + 1) + ' / ' + pad2(total);
    }

    function goTo(index) {
      index = Math.max(0, Math.min(total - 1, index));
      slides[index].scrollIntoView({
        behavior: reducedMotion ? 'auto' : 'smooth',
        inline: 'start',
        block: 'nearest'
      });
    }

    prevBtn.addEventListener('click', function () {
      goTo(current - 1);
    });
    nextBtn.addEventListener('click', function () {
      goTo(current + 1);
    });

    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goTo(current + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goTo(current - 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        goTo(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        goTo(total - 1);
      }
    });

    // Detecta a foto atualmente em destaque (swipe manual, drag ou botões)
    // pela posição de scroll, não pela área de interseção — o slide 1
    // (herói, mais alto no desktop) tem uma proporção de área visível
    // diferente dos demais, o que tornava a detecção por
    // IntersectionObserver (threshold de área) incorreta assim que a
    // altura dos slides deixa de ser uniforme.
    var ticking = false;

    function updateCurrentFromScroll() {
      var closestIndex;
      var maxScroll = track.scrollWidth - track.clientWidth;

      // A última foto nem sempre consegue alinhar a própria borda esquerda
      // com a borda da viewport (não sobra scroll suficiente) — nesse caso
      // o scroll bate no máximo antes do "encaixe" visual, e a comparação
      // por borda mais próxima erra para o penúltimo slide. Tratado à parte.
      if (maxScroll <= 0 || track.scrollLeft >= maxScroll - 1) {
        closestIndex = total - 1;
      } else {
        var trackLeft = track.getBoundingClientRect().left;
        var closestDist = Infinity;
        closestIndex = 0;
        slides.forEach(function (slide, i) {
          var dist = Math.abs(slide.getBoundingClientRect().left - trackLeft);
          if (dist < closestDist) {
            closestDist = dist;
            closestIndex = i;
          }
        });
      }

      if (closestIndex !== current) {
        current = closestIndex;
        updateCounter(current);
      }
      ticking = false;
    }

    track.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(updateCurrentFromScroll);
    });

    // Arrastar com o ponteiro (mouse) no desktop — overflow-x nativo já
    // cobre touch/trackpad, mas não responde a clique-e-arraste do mouse.
    var isDragging = false;
    var dragStartX = 0;
    var dragStartScroll = 0;
    var dragMoved = false;

    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') return; // touch já tem scroll nativo
      isDragging = true;
      dragMoved = false;
      dragStartX = e.clientX;
      dragStartScroll = track.scrollLeft;
      track.classList.add('is-dragging');
      track.setPointerCapture(e.pointerId);
    });

    track.addEventListener('pointermove', function (e) {
      if (!isDragging) return;
      var delta = e.clientX - dragStartX;
      if (Math.abs(delta) > 3) dragMoved = true;
      track.scrollLeft = dragStartScroll - delta;
    });

    function endDrag(e) {
      if (!isDragging) return;
      isDragging = false;
      track.classList.remove('is-dragging');
      try {
        track.releasePointerCapture(e.pointerId);
      } catch (err) {
        /* no-op */
      }
      // Depois de soltar, encaixa no slide mais próximo (scroll-snap não
      // é acionado durante scrollLeft manual via drag).
      var nearestIndex = current;
      var trackLeft = track.getBoundingClientRect().left;
      var closestDist = Infinity;
      slides.forEach(function (slide, i) {
        var dist = Math.abs(slide.getBoundingClientRect().left - trackLeft);
        if (dist < closestDist) {
          closestDist = dist;
          nearestIndex = i;
        }
      });
      goTo(nearestIndex);
    }

    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);

    // Evita que a foto seja "arrastada" como imagem (ghost drag nativo)
    // e que um drag vire clique acidental na figura.
    track.addEventListener('dragstart', function (e) {
      e.preventDefault();
    });
    track.addEventListener('click', function (e) {
      if (dragMoved) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);

    updateCurrentFromScroll();
  })();

  // ---------- Menu de navegação do site (seções) ----------

  (function () {
    var sitenav = document.getElementById('sitenav-panel');
    var menuBtn = document.getElementById('header-menu-btn');
    if (!sitenav || !menuBtn) return;

    var panelEl = sitenav.querySelector('.sitenav__panel');

    function openSitenav() {
      sitenav.hidden = false;
      document.body.style.overflow = 'hidden';
      var firstLink = panelEl.querySelector('.sitenav__link');
      if (firstLink) firstLink.focus();
    }

    function closeSitenav() {
      sitenav.hidden = true;
      document.body.style.overflow = '';
      menuBtn.focus();
    }

    menuBtn.addEventListener('click', openSitenav);
    document.querySelectorAll('[data-close="sitenav"]').forEach(function (el) {
      el.addEventListener('click', closeSitenav);
    });
    sitenav.querySelectorAll('.sitenav__link').forEach(function (link) {
      link.addEventListener('click', closeSitenav);
    });

    panelEl.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var focusable = panelEl.querySelectorAll('button:not([disabled]), a[href]');
      focusable = Array.prototype.filter.call(focusable, function (el) {
        return el.offsetParent !== null;
      });
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !sitenav.hidden) closeSitenav();
    });
  })();

  // ---------- Finalização do pedido (WhatsApp) ----------

  var WHATSAPP_NUMBER = '5511995865222';

  (function () {
    var checkout = document.getElementById('checkout-panel');
    if (!checkout) return;

    var formView = document.getElementById('checkout-form-view');
    var confirmView = document.getElementById('checkout-confirm-view');
    var nameInput = document.getElementById('checkout-name');
    var nameError = document.getElementById('checkout-name-error');
    var phoneInput = document.getElementById('checkout-phone');
    var modeList = document.getElementById('checkout-mode-list');
    var modeError = document.getElementById('checkout-mode-error');
    var notesInput = document.getElementById('checkout-notes');
    var notesCounter = document.getElementById('checkout-notes-counter');
    var summaryItemsEl = document.getElementById('checkout-summary-items');
    var totalEl = document.getElementById('checkout-total');
    var cartErrorEl = document.getElementById('checkout-cart-error');
    var submitBtn = document.getElementById('checkout-submit-btn');
    var backBtn = document.getElementById('checkout-back-btn');
    var notesMax = 240;

    var selectedMode = '';

    function renderCheckoutSummary() {
      summaryItemsEl.innerHTML = '';
      getCartLines().forEach(function (line) {
        var row = document.createElement('div');
        row.className = 'checkout__summary-row';
        row.innerHTML =
          '<div class="checkout__summary-row-top">' +
            '<span class="t1"></span>' +
            '<span class="t2"></span>' +
          '</div>' +
          '<span class="t3"></span>';
        var nameLabel = line.qty + 'x ' + line.name + (line.milk !== 'Comum' ? ' — ' + line.milk : '');
        row.querySelectorAll('span')[0].textContent = nameLabel;
        row.querySelectorAll('span')[1].textContent = formatBRL(line.subtotal);
        row.querySelectorAll('span')[2].textContent = 'Unitário: ' + formatBRL(line.unitPrice);
        summaryItemsEl.appendChild(row);
      });
      totalEl.textContent = formatBRL(getCartTotal());
    }

    function resetCheckoutForm() {
      nameInput.value = '';
      phoneInput.value = '';
      notesInput.value = '';
      notesCounter.textContent = '0 / ' + notesMax;
      selectedMode = '';
      modeList.querySelectorAll('.btn2').forEach(function (b) {
        b.classList.remove('is-active');
      });
      nameError.hidden = true;
      modeError.hidden = true;
      cartErrorEl.hidden = true;
      formView.hidden = false;
      confirmView.hidden = true;
    }

    function openCheckout() {
      resetCheckoutForm();
      renderCheckoutSummary();
      checkout.hidden = false;
      document.body.style.overflow = 'hidden';
      nameInput.focus();
    }

    function closeCheckout() {
      checkout.hidden = true;
      document.body.style.overflow = '';
      // O botão "Finalizar pedido" mora dentro do painel do carrinho, que
      // já está fechado neste ponto do fluxo (fecha antes do checkout
      // abrir) — focar um elemento invisível falha silenciosamente. O
      // ícone do carrinho no header é o alvo visível equivalente.
      document.getElementById('header-cart-btn').focus();
    }

    // Prende o foco dentro do painel enquanto ele estiver aberto (Tab no
    // último campo volta ao primeiro, Shift+Tab no primeiro vai ao último)
    // — sem isso o Tab escapava para elementos de fundo (ex.: a barra
    // flutuante do pedido) atrás do overlay.
    var panelEl = checkout.querySelector('.checkout__panel');
    panelEl.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var focusable = panelEl.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      focusable = Array.prototype.filter.call(focusable, function (el) {
        return el.offsetParent !== null; // visível (não hidden/display:none)
      });
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });

    cartCheckoutBtn.addEventListener('click', function () {
      if (cart.length === 0) return;
      closeCart();
      openCheckout();
    });

    document.querySelectorAll('[data-close="checkout"]').forEach(function (el) {
      el.addEventListener('click', closeCheckout);
    });

    backBtn.addEventListener('click', function () {
      closeCheckout();
    });

    nameInput.addEventListener('input', function () {
      if (nameInput.value.trim()) nameError.hidden = true;
    });

    notesInput.addEventListener('input', function () {
      if (notesInput.value.length > notesMax) {
        notesInput.value = notesInput.value.slice(0, notesMax);
      }
      notesCounter.textContent = notesInput.value.length + ' / ' + notesMax;
    });

    modeList.addEventListener('click', function (e) {
      var btn = e.target.closest('.btn2');
      if (!btn) return;
      modeList.querySelectorAll('.btn2').forEach(function (b) {
        b.classList.remove('is-active');
      });
      btn.classList.add('is-active');
      selectedMode = btn.getAttribute('data-mode');
      modeError.hidden = true;
    });

    // Formatação de moeda só para a mensagem do WhatsApp (padrão brasileiro
    // com centavos). Não altera formatBRL nem o valor numérico em si —
    // apenas como o mesmo número já calculado é apresentado como texto.
    function formatBRLDecimal(n) {
      return 'R$ ' + n.toFixed(2).replace('.', ',');
    }

    // Texto puro em toda a mensagem — nome/telefone/observação nunca são
    // interpretados como HTML, só concatenados como string e depois
    // codificados via encodeURIComponent para a URL do WhatsApp.
    function buildWhatsAppMessage() {
      var lines = getCartLines();
      var total = getCartTotal();
      var name = nameInput.value.trim();
      var phone = phoneInput.value.trim();
      var notes = notesInput.value.trim();

      var parts = [];
      parts.push('Olá! Gostaria de fazer um pedido na Avelí ☕️');
      parts.push('');
      parts.push('*PEDIDO*');
      lines.forEach(function (line) {
        var label = line.qty + 'x ' + line.name + (line.milk !== 'Comum' ? ' (' + line.milk + ')' : '');
        parts.push(label + ' — ' + formatBRLDecimal(line.subtotal));
      });
      parts.push('');
      parts.push('*Total: ' + formatBRLDecimal(total) + '*');
      parts.push('');
      parts.push('*Cliente:* ' + name);
      if (phone) {
        parts.push('*Telefone:* ' + phone);
      }
      parts.push('*Modalidade:* ' + selectedMode);
      if (notes) {
        parts.push('');
        parts.push('*Observações:*');
        parts.push(notes);
      }
      return parts.join('\n');
    }

    submitBtn.addEventListener('click', function () {
      var isValid = true;
      var firstInvalid = null;

      if (cart.length === 0) {
        cartErrorEl.hidden = false;
        isValid = false;
      } else {
        cartErrorEl.hidden = true;
      }

      if (!nameInput.value.trim()) {
        nameError.hidden = false;
        isValid = false;
        firstInvalid = firstInvalid || nameInput;
      }

      if (!selectedMode) {
        modeError.hidden = false;
        isValid = false;
        firstInvalid = firstInvalid || modeList.querySelector('.btn2');
      }

      if (!isValid) {
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      var message = buildWhatsAppMessage();
      var url = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(message);
      // Nova aba: preserva o estado do site (carrinho incluído) mesmo
      // depois de o WhatsApp abrir.
      window.open(url, '_blank', 'noopener');

      formView.hidden = true;
      confirmView.hidden = false;
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !checkout.hidden) closeCheckout();
    });
  })();

  renderCart();
})();
