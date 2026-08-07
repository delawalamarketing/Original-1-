# Original 1% - Shopify Theme

A conversion-focused Online Store 2.0 theme built from scratch for **Original 1%**
(*Conscious Lifestyle & Skincare*). No page-builder app, no framework, no jQuery.

Brand colours are sampled directly from the packaging and logo lockup:

| Token | Hex | Where it came from |
|---|---|---|
| Bone (canvas) | `#E4E2DD` | the packaging backdrop |
| Paper (surfaces) | `#FAF9F7` | cards, inputs |
| Ink | `#14181A` | label typography |
| Forest (primary action) | `#304824` | the carton |
| Sage | `#99BA8F` | O1% logo mark fill |
| Teal | `#469D99` | O1% logo ring |
| Brass (accent) | `#B27409` | "Boost your skin's radiance" pill |

---

## Install

### Option A - upload the ZIP (fastest)

1. Shopify admin → **Online Store → Themes**
2. **Add theme → Upload zip file** → choose `original-1pct-theme.zip`
3. **Customize** to set the menu, images and products.

> Shopify rejects a zip that contains a wrapping folder. `original-1pct-theme.zip`
> is already packed correctly - `layout/`, `sections/`, `templates/` sit at the root.

### Option B - Shopify CLI (recommended for ongoing work)

```bash
npm install -g @shopify/cli@latest
```

```bash
shopify theme dev --store your-store.myshopify.com
```

Hot reload on save, and a shareable preview link. When you're happy:

```bash
shopify theme push --unpublished
```

---

## Post-install checklist

Roughly 30 minutes, in this order.

### 1. Products

Create the four products with these exact handles so the demo content lines up:

| Handle | SKU | Title | Size | Step |
|---|---|---|---|---|
| `frank-castor` | `00` | Frank Castor | 50mL | Step 00 · Weekly Lubrication |
| `rice-toner` | `01` | Rice Toner | 50mL | Step 01 · Daily Hydration |
| `rice-silk-serum` | `02` | Rice Silk Serum | 50mL | Step 02 · Daily Rejuvenation |
| `orchid-lotion` | `03` | Orchid Lotion | 48g | Step 03 · Daily Moisturization |

Each ships at **350 g** including the retail box. Avoid "treat" and "treatment"
in any product copy - both read as medical claims for a cosmetic product.

Create a collection called **The Ritual** containing all four, sorted manually
in step order (0 → 3). The homepage and the product-page cross-sell both read it.

### 2. Product metafields

**Settings → Custom data → Products**. The theme reads these; all are optional
and it degrades gracefully when they're empty.

| Namespace + key | Type | Used for |
|---|---|---|
| `custom.routine_step` | Single line text | The "Step 01" badge on cards and PDP |
| `custom.short_description` | Multi-line text | Card blurb + PDP lede |
| `custom.benefits` | **List of** single line text | The ticked benefit list on the PDP |
| `custom.ingredients_full` | Rich text | "Full ingredients" accordion |
| `custom.how_to_use` | Rich text | "How to use" accordion |
| `custom.size` | Single line text | `50mL (1.69 oz)` under the PDP title |
| `custom.claim_line` | Single line text | Testing/certification line under the PDP title. Set it only on products whose documentation you hold. |

### 3. Theme settings

**Customize → Theme settings**

- **Brand identity** - upload the logo. The theme ships with the O1% mark and
  wordmark bundled so it looks right immediately; uploading replaces both.
- **Cart** - the free-shipping threshold is **$100**, matching the shipping
  rates in Settings → Shipping. Change one and you must change the other, or
  the progress bar promises something checkout will not honour.
- **Colours / Typography** - already set to the brand palette.

### 4. Navigation

**Content → Menus → Main menu.** Keep it to five links or fewer:

```
Shop  ·  The Ritual  ·  Ingredients  ·  Our Story  ·  Journal
```

### 5. Homepage

**Customize → Home page.** Assign a product to each of the four Ritual step
blocks, and point the Bundle section at either a bundle product or the four
individual products.

### 6. Discounts

If you're using the Bundle section without a real bundle product, create a
matching automatic discount in **Discounts** so the price shown is the price charged.

---

## Structure

```
assets/
  base.css                 design system + every component
  theme.js                 custom elements (cart, variants, drawers, sticky ATC)
  logo*.png                bundled brand marks (dark + light, stacked + horizontal)
config/
  settings_schema.json     theme editor settings
  settings_data.json       defaults, pre-set to the brand palette
layout/
  theme.liquid             document shell, fonts, JSON-LD, cart + menu drawers
  password.liquid          pre-launch shell
locales/
  en.default.json          all UI copy - no hard-coded strings in sections
sections/
  header-group.json        announcement bar + header
  footer-group.json        newsletter + footer
  hero / trust-bar / ritual-steps / bundle / ingredients /
  testimonials / faq / newsletter / image-with-text / rich-text /
  featured-collection / complete-the-ritual
  main-*.liquid            one per template
  cart-drawer / mobile-menu
snippets/
  product-card · price · rating · icon · meta-tags
  accordion-item · address-fields · social-links
templates/                 JSON templates, incl. customers/
```

### Conventions

- **Sections own layout, snippets own components.** A snippet never contains a
  `{% schema %}`.
- **All copy lives in `locales/en.default.json`.** Adding French later means
  adding `fr.json`, not touching Liquid.
- **All colour and type flows from CSS custom properties** written once in
  `theme.liquid` from theme settings. Nothing hard-codes a hex.
- **Progressive enhancement.** Every form posts and works without JavaScript;
  the custom elements upgrade them.

---

## Conversion features

| Feature | Where | Why |
|---|---|---|
| Sticky add-to-cart | PDP | The single most reliable mobile lift. Appears only after the real button scrolls past. |
| Cart drawer | Global | Keeps shoppers on the page they were browsing. |
| Free-shipping progress bar | Cart drawer + page | Turns "checkout now" into "add one more". |
| 4-step ritual merchandising | Home | Sells a system, not four separate decisions. |
| Bundle section | Home | The main AOV lever. |
| Complete-the-ritual cross-sell | PDP | Filters out the product being viewed. |
| Express wallets | PDP | Shop Pay / Apple Pay / Google Pay skip the whole address form. |
| Subscribe & save | PDP | Appears automatically when a selling plan exists. |
| Product + FAQ JSON-LD | PDP, home | Price, stock, rating and FAQ rows in Google results. |
| Trust bar | Home, PDP, collection | Answers the four objections a first-time buyer forms. |

---

## Accessibility

- Every interactive target is at least 44 × 44 px.
- Focus is never removed, only restyled - a 2px teal ring at 3px offset.
- Drawers trap Tab, close on Escape, and return focus to whatever opened them.
- Variant pickers are native radio inputs; state is CSS, so it survives JS failure.
- `prefers-reduced-motion` disables the marquee, reveals and smooth scrolling.
- Body copy is 15px minimum at 1.65 line-height.

Run **Lighthouse** and Shopify's built-in theme check before publishing:

```bash
shopify theme check
```

---

## Performance notes

- Fonts are served through Shopify's `font_face` from their CDN - no third-party
  request, no render-blocking stylesheet.
- One CSS file, one JS file, both cached at edge. JS is `defer`.
- Every image below the fold is `loading="lazy"`; hero and first product image
  are `fetchpriority="high"`.
- Cart mutations request the drawer markup in the *same* round-trip via the
  Section Rendering API rather than fetching it afterwards.
- No jQuery, no framework, no page-builder runtime.

---

## Things to change before launch

1. **Replace the placeholder testimonials.** They are written as realistic
   examples, not real reviews. Swap the section for your review app's widget
   as soon as you're collecting.
2. **The "4.8 from 320+ reviews" aggregate is a placeholder.** Remove it or make
   it true - a false aggregate rating is a policy problem, not just a taste one.
3. **The free-shipping threshold is $100**, matched across the announcement bar,
   trust bar, PDP and the Shopify shipping rates. Move all five together.
4. **Add your contact email** to the FAQ footer text.
5. **Confirm the claims copy** ("certified Canadian facility", "dermatologically
   tested") matches what you can document.
