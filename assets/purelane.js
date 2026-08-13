/**
 * Purelane Shopify Dawn Theme JavaScript Controller
 * Replicates exact JS behaviors from purelane-homepage.html:
 * - Reveal on scroll (.rv)
 * - Scene crossfade & depth tracking (scenes 1..4)
 * - Desktop progress rail sync (.rail a.on)
 * - Header scroll shrink (#hdr.up)
 * - Parallax water & hero product float
 * - 3-stage hero slideshow (.hstage)
 * - Product rotator (.rot)
 * - Shopify Theme Editor lifecycle hooks
 */

(function () {
  'use strict';

  function initPurelaneScripts() {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- reveal on scroll ---------- */
    var revs = document.querySelectorAll('.rv');
    if ('IntersectionObserver' in window && !reduce) {
      var ro = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            ro.unobserve(e.target);
          }
        });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
      revs.forEach(function (el) { ro.observe(el); });
    } else {
      revs.forEach(function (el) { el.classList.add('in'); });
    }

    /* ---------- scene crossfade (scroll driven, deterministic) ---------- */
    var scenes = [].slice.call(document.querySelectorAll('.scene'));
    var zones = [].slice.call(document.querySelectorAll('[data-scene]'));
    var stage = document.getElementById('scenes');
    var current = 0;

    function setScene(n) {
      if (n === current) return;
      current = n;
      scenes.forEach(function (s, i) { s.classList.toggle('on', i + 1 === n); });
      if (stage) stage.setAttribute('data-d', String(n));
    }

    function pickScene() {
      var focus = window.scrollY + window.innerHeight * 0.5, n = 1;
      for (var i = 0; i < zones.length; i++) {
        var z = zones[i], top = 0, el = z;
        while (el) { top += el.offsetTop; el = el.offsetParent; }
        if (top <= focus) n = parseInt(z.getAttribute('data-scene'), 10) || n;
      }
      setScene(n);
    }

        /* ---------- rail sync & click smooth scroll ---------- */
    var railLinks = [].slice.call(document.querySelectorAll('.rail a'));

    railLinks.forEach(function (a) {
      a.addEventListener('click', function (e) {
        var href = a.getAttribute('href');
        if (href && href.startsWith('#')) {
          var targetEl = document.querySelector(href);
          if (targetEl) {
            e.preventDefault();
            var headerOffset = 50;
            var elementPosition = targetEl.getBoundingClientRect().top;
            var offsetPosition = elementPosition + (window.pageYOffset || window.scrollY) - headerOffset;

            window.scrollTo({
              top: Math.max(0, offsetPosition),
              behavior: 'smooth'
            });
          }
        }
      });
    });

    function syncRail() {
      var viewMid = window.innerHeight * 0.45;

      var targets = [];
      railLinks.forEach(function (a) {
        var href = a.getAttribute('href');
        var target = href ? document.querySelector(href) : null;
        if (target) {
          targets.push({
            href: href,
            rect: target.getBoundingClientRect()
          });
        }
      });

      // Sort targets by their relative top offset in the viewport
      targets.sort(function (a, b) {
        return a.rect.top - b.rect.top;
      });

      var activeTarget = null;
      for (var i = 0; i < targets.length; i++) {
        if (targets[i].rect.top <= viewMid) {
          activeTarget = targets[i];
        }
      }

      if (!activeTarget && targets.length > 0) {
        activeTarget = targets[0];
      }

      railLinks.forEach(function (a) {
        var href = a.getAttribute('href');
        a.classList.toggle('on', activeTarget && href === activeTarget.href);
      });
    }

    /* ---------- parallax + header ---------- */
    var hdr = document.getElementById('hdr');
    var prod = document.getElementById('heroProd');
    var raf = null, mx = 0, my = 0;

    function frame() {
      raf = null;
      var y = window.scrollY || window.pageYOffset;
      if (hdr) hdr.classList.toggle('up', y > 90);
      if (!reduce) {
        var wl = document.querySelectorAll('#water .wl');
        for (var i = 0; i < wl.length; i++) {
          var d = [0.05, 0.09, 0.03, 0.02][i] || 0.05;
          wl[i].style.setProperty('--px', (mx * d * 130).toFixed(1) + 'px');
          wl[i].style.setProperty('--py', (-y * d + my * d * 90).toFixed(1) + 'px');
        }
        if (prod) {
          var f = Math.min(y / 700, 1);
          prod.style.transform = 'translate3d(' + (mx * -16).toFixed(2) + 'px,' + (-f * 54 + my * -10).toFixed(2) + 'px,0) scale(' + (1 - f * 0.06).toFixed(3) + ')';
          prod.style.opacity = (1 - f * 0.55).toFixed(3);
        }
      }
      syncRail();
      pickScene();
    }

    function onScroll() { if (!raf) raf = requestAnimationFrame(frame); }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    if (!reduce && window.matchMedia('(min-width: 1024px)').matches) {
      window.addEventListener('mousemove', function (e) {
        mx = (e.clientX / window.innerWidth - 0.5) * 2;
        my = (e.clientY / window.innerHeight - 0.5) * 2;
        onScroll();
      }, { passive: true });
    }

    /* ---------- ambient drift on the hero product ---------- */
    if (!reduce && prod && prod.animate) {
      prod.animate(
        [{ filter: 'drop-shadow(0 14px 22px rgba(0,74,66,.15))' },
         { filter: 'drop-shadow(0 22px 34px rgba(0,74,66,.22))' },
         { filter: 'drop-shadow(0 14px 22px rgba(0,74,66,.15))' }],
        { duration: 7000, iterations: Infinity, easing: 'ease-in-out' }
      );
    }

    /* ---------- hero stage: 1 -> 2 -> 3 products ---------- */
    var hstage = document.getElementById('hstage');
    if (hstage && !hstage.dataset.bound) {
      hstage.dataset.bound = 'true';
      var hs = [].slice.call(hstage.querySelectorAll('.hslide'));
      var hd = [].slice.call(document.querySelectorAll('#hdots button'));
      var hi = 0, htimer = null;

      function hgo(n) {
        if (!hs.length) return;
        hi = (n + hs.length) % hs.length;
        hs.forEach(function (s, i) { s.classList.toggle('on', i === hi); });
        hd.forEach(function (d, i) { d.classList.toggle('on', i === hi); });
      }

      function hplay() {
        if (!htimer && !reduce && hs.length > 1) {
          htimer = setInterval(function () { hgo(hi + 1); }, 3800);
        }
      }

      function hstop() {
        if (htimer) {
          clearInterval(htimer);
          htimer = null;
        }
      }

      hd.forEach(function (d, i) {
        d.addEventListener('click', function () { hstop(); hgo(i); hplay(); });
      });

      hstage.addEventListener('mouseenter', hstop);
      hstage.addEventListener('mouseleave', hplay);

      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) {
          es.forEach(function (e) { e.isIntersecting ? hplay() : hstop(); });
        }, { threshold: 0.2 }).observe(hstage);
      } else {
        hplay();
      }
    }

    /* ---------- product rotator ---------- */
    var rot = document.getElementById('rot');
    if (rot && !rot.dataset.bound) {
      rot.dataset.bound = 'true';
      var rimgs = [].slice.call(rot.querySelectorAll('.frame .pimg, .frame img'));
      var rdots = [].slice.call(rot.querySelectorAll('.dots i'));
      var rcapB = rot.querySelector('.cap b');
      var rcapS = rot.querySelector('.cap span');
      var ri = 0, rtimer = null;

      function rstep() {
        if (!rimgs.length) return;
        rimgs[ri].classList.remove('on');
        if (rdots[ri]) rdots[ri].classList.remove('on');

        ri = (ri + 1) % rimgs.length;

        rimgs[ri].classList.add('on');
        if (rdots[ri]) rdots[ri].classList.add('on');

        if (rcapB) rcapB.innerHTML = rimgs[ri].getAttribute('data-name') || '';
        if (rcapS) rcapS.textContent = rimgs[ri].getAttribute('data-note') || '';
      }

      if (!reduce && rimgs.length > 1) {
        var rio = new IntersectionObserver(function (es) {
          es.forEach(function (e) {
            if (e.isIntersecting && !rtimer) rtimer = setInterval(rstep, 2900);
            else if (!e.isIntersecting && rtimer) { clearInterval(rtimer); rtimer = null; }
          });
        }, { threshold: 0.25 });
        rio.observe(rot);
      }
    }

    frame();
  }

  /* ---------- Shopify AJAX Cart & Glass Drawer Handler ---------- */
  function initCartHandler() {
    if (window._purelaneCartBound) return;
    window._purelaneCartBound = true;

    var drawer = document.getElementById('purelaneCartDrawer');
    var overlay = document.getElementById('purelaneCartOverlay');
    var closeBtn = document.getElementById('purelaneCartClose');

    function formatMoney(cents) {
      if (typeof cents !== 'number') cents = parseInt(cents, 10) || 0;
      var rupees = Math.floor(cents / 100);
      return '₹' + rupees.toLocaleString('en-IN');
    }

    function openCart() {
      if (drawer) drawer.classList.add('is-open');
      if (overlay) overlay.classList.add('is-open');
      refreshCart();
    }

    function closeCart() {
      if (drawer) drawer.classList.remove('is-open');
      if (overlay) overlay.classList.remove('is-open');
    }

    if (closeBtn) closeBtn.addEventListener('click', closeCart);
    if (overlay) overlay.addEventListener('click', closeCart);

    document.addEventListener('click', function (e) {
      if (e.target.closest('.cd-close-trigger')) {
        closeCart();
      }
    });

    // Open Cart trigger for DailyDrop float bar & Header
    document.addEventListener('click', function (e) {
      var trigger = e.target.closest('#ddOpenCart, header .ico[aria-label*="Cart"], .navtools a[href*="cart"]');
      if (trigger) {
        e.preventDefault();
        openCart();
      }
    });

    function refreshCart() {
      fetch('/cart.js')
        .then(function (r) { return r.json(); })
        .then(function (cart) {
          renderCartData(cart);
        })
        .catch(function (err) { console.error('Cart refresh error:', err); });
    }

    function renderCartData(cart) {
      // Update count dots & header badges
      var dots = document.querySelectorAll('.navtools .dot, header .dot, .cd-count');
      dots.forEach(function (dot) {
        if (dot.classList.contains('cd-count')) {
          dot.textContent = cart.item_count + (cart.item_count === 1 ? ' item' : ' items');
        } else {
          dot.textContent = cart.item_count;
        }
      });

      // Update DailyDrop Floating Bottom Bar
      var ddBar = document.getElementById('dailydropCartBar');
      var ddCount = document.getElementById('ddItemCount');
      var ddPrice = document.getElementById('ddTotalPrice');
      if (ddBar) {
        if (cart.item_count > 0) {
          ddBar.style.display = 'flex';
          if (ddCount) ddCount.textContent = cart.item_count + (cart.item_count === 1 ? ' item' : ' items');
          if (ddPrice) ddPrice.textContent = formatMoney(cart.total_price);
        } else {
          ddBar.style.display = 'none';
        }
      }

      // Sync DailyDrop Inline Card Steppers across all product cards
      var cardActions = document.querySelectorAll('.purelane-cart-action');
      cardActions.forEach(function (action) {
        var vId = action.getAttribute('data-variant-id');
        var addBtn = action.querySelector('.purelane-add-to-cart');
        var stepper = action.querySelector('.purelane-qty-stepper');
        var valSpan = action.querySelector('.dd-stepper-val');

        if (!vId || !cart.items) return;

        var cartItem = cart.items.find(function (it) {
          return String(it.variant_id) === String(vId) || String(it.id) === String(vId);
        });

        if (cartItem && cartItem.quantity > 0) {
          if (addBtn) addBtn.style.display = 'none';
          if (stepper) stepper.style.display = 'flex';
          if (valSpan) valSpan.textContent = cartItem.quantity;
        } else {
          if (addBtn) addBtn.style.display = '';
          if (stepper) stepper.style.display = 'none';
        }
      });

      var body = document.getElementById('purelaneCartBody');
      var foot = document.getElementById('purelaneCartFoot');
      var subtotalEl = document.getElementById('purelaneCartSubtotal');

      if (subtotalEl) {
        subtotalEl.textContent = formatMoney(cart.total_price);
      }

      if (foot) {
        foot.style.display = cart.item_count === 0 ? 'none' : 'flex';
      }

      if (!body) return;

      if (cart.item_count === 0) {
        body.innerHTML = '<div class="cd-empty">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" width="56" height="56" style="opacity: 0.3; margin-bottom: 12px;"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg>' +
          '<h4>Your cart is currently empty</h4>' +
          '<p>Explore our plant-powered homecare range and build your box today.</p>' +
          '<a href="#shop" class="btn btn-primary cd-close-trigger" style="margin-top: 16px;">Shop Bestsellers</a>' +
          '</div>';
        return;
      }

      var html = '<div class="cd-items">';
      cart.items.forEach(function (item) {
        var imgHtml = item.image
          ? '<img src="' + item.image + '" alt="' + (item.title || '') + '" width="60" height="60">'
          : '<div style="width:100%;height:100%;display:grid;place-items:center;background:rgba(255,255,255,0.08);color:#fff;font-size:10px;">No image</div>';

        html += '<div class="cd-item glass" data-key="' + item.key + '">' +
          '<div class="cd-thumb">' + imgHtml + '</div>' +
          '<div class="cd-info">' +
            '<h4>' + item.product_title + '</h4>' +
            (item.variant_title && item.variant_title !== 'Default Title' ? '<span class="cd-var">' + item.variant_title + '</span>' : '') +
            '<div class="cd-pr">' + formatMoney(item.final_line_price) + '</div>' +
            '<div class="cd-qty-wrap">' +
              '<button type="button" class="cd-qty-btn cd-qty-minus" data-key="' + item.key + '" data-qty="' + (item.quantity - 1) + '" aria-label="Decrease quantity">-</button>' +
              '<span class="cd-qty-val">' + item.quantity + '</span>' +
              '<button type="button" class="cd-qty-btn cd-qty-plus" data-key="' + item.key + '" data-qty="' + (item.quantity + 1) + '" aria-label="Increase quantity">+</button>' +
              '<button type="button" class="cd-remove" data-key="' + item.key + '" aria-label="Remove item">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      });
      html += '</div>';
      body.innerHTML = html;
    }

    // Add to Cart Button Click Handler
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.purelane-add-to-cart');
      if (!btn) return;

      var actionWrap = btn.closest('.purelane-cart-action');
      var variantId = actionWrap ? actionWrap.getAttribute('data-variant-id') : btn.getAttribute('data-variant-id');
      var origText = btn.innerHTML;

      if (!variantId) {
        btn.disabled = true;
        btn.innerHTML = 'Added ✓';
        setTimeout(function () {
          btn.innerHTML = origText;
          btn.disabled = false;
        }, 1800);
        openCart();
        return;
      }

      btn.disabled = true;
      btn.innerHTML = 'Adding...';

      fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          items: [{ id: parseInt(variantId, 10), quantity: 1 }]
        })
      })
      .then(function (res) {
        if (!res.ok) throw new Error('Cart add failed');
        return res.json();
      })
      .then(function () {
        btn.innerHTML = 'Added ✓';
        refreshCart();
        setTimeout(function () {
          btn.innerHTML = origText;
          btn.disabled = false;
        }, 1200);
      })
      .catch(function (err) {
        console.error('Purelane Cart Error:', err);
        btn.innerHTML = 'Error';
        setTimeout(function () {
          btn.innerHTML = origText;
          btn.disabled = false;
        }, 2000);
      });
    });

    // DailyDrop Inline Card Stepper (- / +) Click Handler
    document.addEventListener('click', function (e) {
      var stepBtn = e.target.closest('.dd-step-minus, .dd-step-plus');
      if (!stepBtn) return;

      var actionWrap = stepBtn.closest('.purelane-cart-action');
      if (!actionWrap) return;

      var vId = actionWrap.getAttribute('data-variant-id');
      if (!vId) return;

      var isPlus = stepBtn.classList.contains('dd-step-plus');

      fetch('/cart.js')
        .then(function (r) { return r.json(); })
        .then(function (cart) {
          var item = cart.items.find(function (it) {
            return String(it.variant_id) === String(vId) || String(it.id) === String(vId);
          });
          var currentQty = item ? item.quantity : 0;
          var newQty = isPlus ? currentQty + 1 : Math.max(0, currentQty - 1);

          return fetch('/cart/change.js', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({ id: String(vId), quantity: newQty })
          });
        })
        .then(function (r) { return r.json(); })
        .then(function (cart) {
          renderCartData(cart);
        })
        .catch(function (err) { console.error('Card stepper error:', err); });
    });

    // Cart Drawer Quantity Modifier Handler (/cart/change.js)
    document.addEventListener('click', function (e) {
      var modBtn = e.target.closest('.cd-qty-btn, .cd-remove');
      if (!modBtn) return;

      var key = modBtn.getAttribute('data-key');
      var qty = modBtn.classList.contains('cd-remove') ? 0 : parseInt(modBtn.getAttribute('data-qty'), 10);
      if (!key || isNaN(qty)) return;

      fetch('/cart/change.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ id: key, quantity: qty })
      })
      .then(function (r) { return r.json(); })
      .then(function (cart) {
        renderCartData(cart);
      })
      .catch(function (err) { console.error('Cart change error:', err); });
    });

    // Initial Cart Refresh on Load
    refreshCart();
  }

  /* DOM Initialization */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initPurelaneScripts();
      initCartHandler();
    });
  } else {
    initPurelaneScripts();
    initCartHandler();
  }

  /* Shopify Theme Editor Events */
  document.addEventListener('shopify:section:load', initPurelaneScripts);
  document.addEventListener('shopify:section:select', initPurelaneScripts);
  document.addEventListener('shopify:section:deselect', initPurelaneScripts);
  document.addEventListener('shopify:section:reorder', initPurelaneScripts);
  document.addEventListener('shopify:section:unload', initPurelaneScripts);
})();

