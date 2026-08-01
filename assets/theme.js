/* ==========================================================================
   ORIGINAL 1% — Theme behaviour
   Dependency-free custom elements. No framework, no jQuery.
   Every element degrades to a working server-rendered form if JS fails.
   ========================================================================== */
(function () {
  'use strict';

  document.documentElement.classList.remove('no-js');

  /* ---------------------------------------------------------------------- */
  /* Utilities                                                              */
  /* ---------------------------------------------------------------------- */

  const routes = window.theme?.routes || {};
  const strings = window.theme?.strings || {};

  const money = (cents) => {
    const format = window.theme?.moneyFormat || '${{amount}}';
    const value = (cents / 100).toLocaleString(window.theme?.locale || 'en-CA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return format.replace(/\{\{\s*amount[^}]*\}\}/, value);
  };

  const debounce = (fn, wait = 250) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(null, args), wait);
    };
  };

  /**
   * Trap Tab focus inside a container while it is open.
   * Returns a cleanup function.
   */
  const trapFocus = (container, firstFocus) => {
    const selector = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';
    const onKeydown = (e) => {
      if (e.key !== 'Tab') return;
      const focusable = Array.from(container.querySelectorAll(selector)).filter(
        (el) => el.offsetParent !== null
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    container.addEventListener('keydown', onKeydown);
    (firstFocus || container.querySelector(selector))?.focus();
    return () => container.removeEventListener('keydown', onKeydown);
  };

  /* ---------------------------------------------------------------------- */
  /* Cart store — single source of truth, broadcasts on change               */
  /* ---------------------------------------------------------------------- */

  const CartStore = {
    _listeners: new Set(),

    subscribe(fn) {
      this._listeners.add(fn);
      return () => this._listeners.delete(fn);
    },

    _emit(cart, sections) {
      this._listeners.forEach((fn) => fn(cart, sections));
      document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart, sections } }));
    },

    /** Section ids the cart mutations should re-render server-side. */
    get sectionIds() {
      return Array.from(document.querySelectorAll('[data-cart-section]'))
        .map((el) => el.dataset.cartSection)
        .filter(Boolean);
    },

    async get() {
      const res = await fetch(`${routes.cart_url || '/cart'}.js`, {
        headers: { Accept: 'application/json' },
      });
      return res.json();
    },

    async add(formData) {
      // Ask for the drawer markup in the same round-trip rather than fetching
      // it again afterwards — this is the hottest path in the store.
      const ids = this.sectionIds;
      if (ids.length) formData.append('sections', ids.join(','));

      const res = await fetch(routes.cart_add_url || '/cart/add.js', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: formData,
      });
      const data = await res.json();
      // Shopify returns 4xx with { description } when a line can't be added.
      if (!res.ok) throw new Error(data.description || data.message || strings.cartError);

      const cart = await this.get();
      this._emit(cart, data.sections);
      return data;
    },

    async change(payload) {
      const ids = this.sectionIds;
      const res = await fetch(routes.cart_change_url || '/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(ids.length ? { ...payload, sections: ids } : payload),
      });
      const cart = await res.json();
      if (!res.ok) throw new Error(cart.description || strings.cartError);
      this._emit(cart, cart.sections);
      return cart;
    },
  };

  window.theme = window.theme || {};
  window.theme.CartStore = CartStore;

  /* ---------------------------------------------------------------------- */
  /* <drawer-element> — mobile nav + cart, shared open/close mechanics       */
  /* ---------------------------------------------------------------------- */

  class DrawerElement extends HTMLElement {
    connectedCallback() {
      this.releaseFocus = null;
      this.lastFocused = null;

      // Delegated so the handlers survive the panel being re-rendered.
      this.addEventListener('click', (e) => {
        if (e.target.closest('[data-drawer-overlay], [data-drawer-close]')) this.close();
      });

      this.onKeydown = (e) => {
        if (e.key === 'Escape') this.close();
      };
    }

    open(trigger) {
      this.lastFocused = trigger || document.activeElement;
      this.classList.add('is-open');
      this.setAttribute('aria-hidden', 'false');
      document.body.classList.add('drawer-open');
      document.addEventListener('keydown', this.onKeydown);

      const panel = this.querySelector('[data-drawer-panel]');
      // Wait for the transition to start so focus lands on a visible element.
      requestAnimationFrame(() => {
        this.releaseFocus = trapFocus(panel, this.querySelector('[data-drawer-close]'));
      });
    }

    close() {
      this.classList.remove('is-open');
      this.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('drawer-open');
      document.removeEventListener('keydown', this.onKeydown);
      this.releaseFocus?.();
      this.releaseFocus = null;
      this.lastFocused?.focus();
    }
  }
  customElements.define('drawer-element', DrawerElement);

  // Any [data-drawer-trigger="#id"] opens the matching drawer.
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-drawer-trigger]');
    if (!trigger) return;
    const drawer = document.querySelector(trigger.dataset.drawerTrigger);
    if (!drawer) return;
    e.preventDefault();
    drawer.open(trigger);
  });

  /* ---------------------------------------------------------------------- */
  /* <cart-drawer> — renders itself from a section render request           */
  /* ---------------------------------------------------------------------- */

  class CartDrawer extends DrawerElement {
    connectedCallback() {
      super.connectedCallback();
      this.unsubscribe = CartStore.subscribe((cart, sections) => this.refresh(sections));

      // Line-item controls are delegated, so they keep working after a re-render.
      this.addEventListener('click', async (e) => {
        const remove = e.target.closest('[data-line-remove]');
        if (!remove) return;
        e.preventDefault();
        await this.mutate({ line: Number(remove.dataset.lineRemove), quantity: 0 });
      });

      this.addEventListener('change', async (e) => {
        const input = e.target.closest('[data-line-qty]');
        if (!input) return;
        await this.mutate({ line: Number(input.dataset.lineQty), quantity: Number(input.value) });
      });
    }

    disconnectedCallback() {
      this.unsubscribe?.();
    }

    async mutate(payload) {
      this.setBusy(true);
      try {
        await CartStore.change(payload);
      } catch (err) {
        this.showError(err.message);
      }
      this.setBusy(false);
    }

    setBusy(state) {
      this.toggleAttribute('data-busy', state);
      const body = this.querySelector('[data-drawer-body]');
      if (body) body.style.opacity = state ? '0.5' : '1';
    }

    showError(message) {
      const box = this.querySelector('[data-cart-error]');
      if (!box) return;
      box.textContent = message || strings.cartError || 'Something went wrong.';
      box.hidden = false;
    }

    /**
     * Re-render from server-rendered Liquid so the drawer and the cart page can
     * never drift apart. Uses markup returned by the mutation when available,
     * and only falls back to a fetch when it isn't.
     */
    async refresh(sections) {
      const sectionId = this.dataset.sectionId;
      if (!sectionId) return;

      let html = sections?.[sectionId];
      if (!html) {
        const res = await fetch(`${routes.cart_url || '/cart'}?section_id=${sectionId}`);
        html = await res.text();
      }

      const fresh = new DOMParser().parseFromString(html, 'text/html');
      const next = fresh.querySelector('[data-drawer-panel]');
      const current = this.querySelector('[data-drawer-panel]');
      if (next && current) current.innerHTML = next.innerHTML;
    }
  }
  customElements.define('cart-drawer', CartDrawer);

  /* ---------------------------------------------------------------------- */
  /* Cart count bubbles — update everywhere on any cart change               */
  /* ---------------------------------------------------------------------- */

  CartStore.subscribe((cart) => {
    document.querySelectorAll('[data-cart-count]').forEach((el) => {
      el.textContent = cart.item_count;
      el.hidden = cart.item_count === 0;
    });
    document.querySelectorAll('[data-cart-total]').forEach((el) => {
      el.textContent = money(cart.total_price);
    });
  });

  /* ---------------------------------------------------------------------- */
  /* <product-form> — AJAX add to cart, opens the drawer on success          */
  /* ---------------------------------------------------------------------- */

  class ProductForm extends HTMLElement {
    connectedCallback() {
      this.form = this.querySelector('form');
      this.button = this.querySelector('[type="submit"]');
      this.errorBox = this.querySelector('[data-form-error]');
      if (!this.form) return;
      this.form.addEventListener('submit', (e) => this.onSubmit(e));
    }

    async onSubmit(e) {
      e.preventDefault();
      if (this.button?.hasAttribute('disabled')) return;

      const originalLabel = this.button?.querySelector('[data-btn-label]')?.textContent;
      this.setLoading(true);
      if (this.errorBox) this.errorBox.hidden = true;

      try {
        await CartStore.add(new FormData(this.form));

        const drawer = document.querySelector('cart-drawer');
        this.setLoading(false, strings.added || 'Added');
        drawer?.open(this.button);

        setTimeout(() => {
          const label = this.button?.querySelector('[data-btn-label]');
          if (label && originalLabel) label.textContent = originalLabel;
        }, 1600);
      } catch (err) {
        this.setLoading(false);
        if (this.errorBox) {
          this.errorBox.textContent = err.message;
          this.errorBox.hidden = false;
        }
      }
    }

    setLoading(state, label) {
      if (!this.button) return;
      this.button.toggleAttribute('aria-disabled', state);
      this.button.querySelector('[data-btn-spinner]')?.toggleAttribute('hidden', !state);
      const labelEl = this.button.querySelector('[data-btn-label]');
      if (labelEl && label) labelEl.textContent = label;
    }
  }
  customElements.define('product-form', ProductForm);

  /* ---------------------------------------------------------------------- */
  /* <variant-selector> — swaps price, availability, media, URL              */
  /* ---------------------------------------------------------------------- */

  class VariantSelector extends HTMLElement {
    connectedCallback() {
      this.variants = JSON.parse(this.querySelector('[data-variants]')?.textContent || '[]');
      // Clicking a <label> checks its radio natively and fires change here.
      this.addEventListener('change', () => this.onChange());
    }

    get selectedOptions() {
      return Array.from(this.querySelectorAll('input[type="radio"]:checked, select')).map(
        (el) => el.value
      );
    }

    onChange() {
      const selected = this.selectedOptions;
      const variant = this.variants.find((v) =>
        v.options.every((opt, i) => opt === selected[i])
      );

      const root = this.closest('[data-product-root]') || document;
      const idInput = root.querySelector('[data-variant-id]');
      // Both the inline price and the sticky bar's price carry this hook.
      const priceEls = root.querySelectorAll('[data-price-block]');
      const button = root.querySelector('[data-add-button]');
      const label = button?.querySelector('[data-btn-label]');

      if (!variant) {
        button?.setAttribute('disabled', '');
        if (label) label.textContent = strings.unavailable || 'Unavailable';
        return;
      }

      if (idInput) idInput.value = variant.id;

      if (variant.available) {
        button?.removeAttribute('disabled');
        if (label) label.textContent = strings.addToCart || 'Add to cart';
      } else {
        button?.setAttribute('disabled', '');
        if (label) label.textContent = strings.soldOut || 'Sold out';
      }

      const priceHtml = variant.compare_at_price > variant.price
        ? `<span class="price price--sale"><span class="price__current">${money(variant.price)}</span>` +
          `<s class="price__compare">${money(variant.compare_at_price)}</s></span>`
        : `<span class="price"><span class="price__current">${money(variant.price)}</span></span>`;
      priceEls.forEach((el) => { el.innerHTML = priceHtml; });

      // Keep the URL shareable without adding a history entry per click.
      if (variant.id) {
        const url = new URL(window.location.href);
        url.searchParams.set('variant', variant.id);
        window.history.replaceState({}, '', url);
      }

      if (variant.featured_media?.id) {
        root.querySelector(`[data-media-id="${variant.featured_media.id}"]`)?.click();
      }

      document.dispatchEvent(new CustomEvent('variant:changed', { detail: { variant } }));
    }
  }
  customElements.define('variant-selector', VariantSelector);

  /* ---------------------------------------------------------------------- */
  /* <product-gallery> — thumbnail → main image                              */
  /* ---------------------------------------------------------------------- */

  class ProductGallery extends HTMLElement {
    connectedCallback() {
      this.main = this.querySelector('[data-gallery-main] img');
      this.thumbs = Array.from(this.querySelectorAll('[data-media-id]'));
      this.thumbs.forEach((thumb) => {
        thumb.addEventListener('click', () => this.select(thumb));
      });
    }

    select(thumb) {
      const img = thumb.querySelector('img');
      if (this.main && img) {
        this.main.src = img.dataset.full || img.src;
        this.main.srcset = img.dataset.fullSrcset || '';
        this.main.alt = img.alt;
      }
      this.thumbs.forEach((t) => t.setAttribute('aria-current', String(t === thumb)));
    }
  }
  customElements.define('product-gallery', ProductGallery);

  /* ---------------------------------------------------------------------- */
  /* <quantity-input>                                                        */
  /* ---------------------------------------------------------------------- */

  class QuantityInput extends HTMLElement {
    connectedCallback() {
      this.input = this.querySelector('input');
      this.querySelectorAll('[data-qty-step]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const step = Number(btn.dataset.qtyStep);
          const min = Number(this.input.min || 1);
          const next = Math.max(min, Number(this.input.value) + step);
          this.input.value = next;
          this.input.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });
    }
  }
  customElements.define('quantity-input', QuantityInput);

  /* ---------------------------------------------------------------------- */
  /* <accordion-element> — animated, accessible disclosure                   */
  /* ---------------------------------------------------------------------- */

  class AccordionElement extends HTMLElement {
    connectedCallback() {
      this.single = this.hasAttribute('data-single');
      this.triggers = Array.from(this.querySelectorAll('.accordion__trigger'));
      this.triggers.forEach((trigger) => {
        trigger.addEventListener('click', () => this.toggle(trigger));
      });
    }

    toggle(trigger) {
      const panel = document.getElementById(trigger.getAttribute('aria-controls'));
      const isOpen = trigger.getAttribute('aria-expanded') === 'true';

      if (this.single && !isOpen) {
        this.triggers.forEach((t) => {
          if (t === trigger) return;
          t.setAttribute('aria-expanded', 'false');
          document.getElementById(t.getAttribute('aria-controls'))?.setAttribute('data-open', 'false');
        });
      }

      trigger.setAttribute('aria-expanded', String(!isOpen));
      panel?.setAttribute('data-open', String(!isOpen));
    }
  }
  customElements.define('accordion-element', AccordionElement);

  /* ---------------------------------------------------------------------- */
  /* <sticky-atc> — appears once the real buy button scrolls out of view     */
  /* ---------------------------------------------------------------------- */

  class StickyAtc extends HTMLElement {
    connectedCallback() {
      const sentinel = document.querySelector(this.dataset.watch || '[data-add-button]');
      if (!sentinel || !('IntersectionObserver' in window)) return;

      this.observer = new IntersectionObserver(
        ([entry]) => {
          // Show only after the buy button has scrolled *above* the viewport,
          // never while the user is still above it near the top of the page.
          const belowViewport = entry.boundingClientRect.top > 0;
          this.classList.toggle('is-visible', !entry.isIntersecting && !belowViewport);
        },
        { rootMargin: '0px 0px -80px 0px' }
      );
      this.observer.observe(sentinel);

      this.querySelector('[data-sticky-buy]')?.addEventListener('click', () => {
        document.querySelector('[data-add-button]')?.click();
      });
    }

    disconnectedCallback() {
      this.observer?.disconnect();
    }
  }
  customElements.define('sticky-atc', StickyAtc);

  /* ---------------------------------------------------------------------- */
  /* Header scroll state                                                     */
  /* ---------------------------------------------------------------------- */

  const header = document.querySelector('.header');
  if (header) {
    const onScroll = () => {
      header.dataset.scrolled = String(window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------------------------------------------------------------------- */
  /* Reveal on scroll                                                        */
  /* ---------------------------------------------------------------------- */

  const revealTargets = document.querySelectorAll('[data-reveal]');
  if (revealTargets.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          // Stagger siblings for a calmer, more editorial entrance.
          const delay = Number(entry.target.dataset.revealDelay || 0);
          setTimeout(() => entry.target.classList.add('is-revealed'), delay);
          io.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 }
    );
    revealTargets.forEach((el) => io.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add('is-revealed'));
  }

  /* ---------------------------------------------------------------------- */
  /* Collection sort — submit on change, no Apply button needed              */
  /* ---------------------------------------------------------------------- */

  document.querySelectorAll('[data-auto-submit]').forEach((el) => {
    el.addEventListener('change', debounce(() => el.form?.submit(), 120));
  });

  /* ---------------------------------------------------------------------- */
  /* Newsletter — keep the user on the page after Shopify's redirect         */
  /* ---------------------------------------------------------------------- */

  if (window.location.search.includes('customer_posted=true')) {
    document.querySelectorAll('[data-newsletter-success]').forEach((el) => {
      el.hidden = false;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }
})();
