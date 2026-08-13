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

  /* ---------- Shopify AJAX Cart Handler ---------- */
  function initCartHandler() {
    if (window._purelaneCartBound) return;
    window._purelaneCartBound = true;

    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.purelane-add-to-cart');
      if (!btn) return;

      var variantId = btn.getAttribute('data-variant-id');
      var origText = btn.innerHTML;

      if (!variantId) {
        // Fallback demo feedback if no real Shopify variant ID is present
        btn.disabled = true;
        btn.innerHTML = 'Added ✓';
        setTimeout(function () {
          btn.innerHTML = origText;
          btn.disabled = false;
        }, 1800);
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
        // Fetch current cart item count and update header badge
        fetch('/cart.js')
          .then(function (r) { return r.json(); })
          .then(function (cart) {
            var dots = document.querySelectorAll('.navtools .dot, header .dot');
            dots.forEach(function (dot) {
              dot.textContent = cart.item_count;
            });
          })
          .catch(function () {});

        setTimeout(function () {
          btn.innerHTML = origText;
          btn.disabled = false;
        }, 2200);
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

