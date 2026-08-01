# Original 1% - Recommended Stack

The short version: **Shopify + a custom Online Store 2.0 theme in Liquid, with a
deliberately small app list.** Everything below explains why, and what to avoid.

---

## The core decision: why not React / Next.js / Hydrogen?

You said you're importing this into Shopify, which rules out most of the
JavaScript ecosystem immediately - a Next.js app cannot be uploaded to a Shopify
store. But it's worth being explicit about the trade-off, because "headless" gets
recommended a lot to brands it will actively hurt.

| | **Liquid theme** (recommended) | **Hydrogen / headless** |
|---|---|---|
| Upload to Shopify | Yes, a zip | No - separate hosting |
| Theme editor for non-developers | Full | You must build every control |
| App ecosystem | Works out of the box | Most apps don't work |
| Checkout | Shopify's, fully optimised | Shopify's, via redirect |
| Time to launch | Days | Weeks to months |
| Ongoing cost | Shopify plan only | Plan + hosting + dev time |
| Who can edit the homepage | Anyone | A developer |

**Headless is the right answer when** you need a storefront Shopify's templating
genuinely can't express, you have in-house React developers, or you're running
content from a separate CMS at scale.

**None of those apply to a four-SKU skincare brand.** Headless here would mean
paying a permanent tax in developer time for capability you won't use, and losing
the theme editor - which is the thing that lets you run your own store.

Revisit this at roughly 8-figure revenue, or when a specific requirement forces
it. Not before.

---

## What's actually in the build

| Layer | Choice | Why |
|---|---|---|
| Platform | **Shopify** (Basic → Grow) | Checkout is the best in the industry and you can't beat it by building your own |
| Theme architecture | **Online Store 2.0** - JSON templates, sections, blocks | Merchandising changes without a developer |
| Templating | **Liquid** | Server-rendered, cached at Shopify's edge, zero client-side hydration cost |
| CSS | **Hand-written, custom properties, container queries** | No Tailwind build step to maintain; the theme editor writes tokens directly into `:root` |
| JavaScript | **Vanilla custom elements** (~11KB) | No framework, no jQuery. Every form works server-side if JS fails |
| Cart | **AJAX Cart API + Section Rendering API** | Liquid stays the single source of markup - drawer and cart page can't drift |
| Structured data | **JSON-LD** - Product, FAQPage, Organization, WebSite | Price/stock/rating and FAQ rows in Google results |
| Fonts | **Shopify `font_face`** from their CDN | No third-party connection, no render-blocking stylesheet |
| Images | **Shopify CDN** via `image_url` with responsive `srcset` | Automatic WebP/AVIF, resized at edge |

**Zero npm dependencies at runtime.** Nothing to patch, nothing to break on a
transitive update.

---

## Developer workflow

```bash
npm install -g @shopify/cli@latest
```

Local development with hot reload and a shareable preview URL:

```bash
shopify theme dev --store your-store.myshopify.com
```

Shopify's own linter - run it before every push:

```bash
shopify theme check
```

Push as an unpublished theme so you can preview before going live:

```bash
shopify theme push --unpublished
```

**Version control:** put the theme in Git. `shopify theme pull` after anyone
edits in the admin, then commit - otherwise theme-editor changes are invisible
and unrecoverable.

---

## Apps: the shortlist

Every app injects JavaScript on every page. This is the single biggest threat to
your store's speed and, therefore, to conversion. Treat the list as a budget.

### Install at launch

| Need | Recommendation | Notes |
|---|---|---|
| **Reviews** | Judge.me | Best value; the theme already reads the standard `reviews.rating` metafields, so star ratings appear with no template work |
| **Email / SMS** | Klaviyo | Abandoned cart, browse abandonment, replenishment at ~60 days. Highest-ROI channel you own |
| **Subscriptions** | Shopify Subscriptions (free) | Native selling plans. The PDP already renders subscribe & save when a plan exists |
| **Bundles** | Shopify Bundles (free) | Real bundle products - one line item, one inventory record, discount handled natively |
| **Analytics** | GA4 + Shopify Analytics | Configure via **Customer Events**, not by pasting script tags into Liquid |

### Add once there's traffic to justify it

- **Loyalty** - Smile.io, when you have repeat customers to reward.
- **Search** - only if the catalogue outgrows four products. It won't soon.
- **Quiz / routine finder** - a strong fit for this brand (great for email
  capture and personalisation), but validate demand before paying monthly.

### Actively avoid

- **Page builders** (Shogun, PageFly, GemPages). You have a custom theme with
  proper sections. A page builder would add a heavy runtime, fight your design
  system, and lock your content into their format.
- **"Speed booster" apps.** They mostly defer scripts other apps added. Remove
  the apps instead.
- **Multiple apps doing the same job.** Two review apps means two sets of
  scripts and two sources of truth.
- **Popup apps** if Klaviyo is installed - Klaviyo already does forms.

---

## Data model

Set these up in **Settings → Custom data → Products** before adding products.
The theme reads them and degrades gracefully when they're empty.

| Metafield | Type | Drives |
|---|---|---|
| `custom.routine_step` | Single line text | The "Step 01" badge |
| `custom.short_description` | Multi-line text | Card blurb, PDP lede |
| `custom.benefits` | List of single line text | Ticked benefit list |
| `custom.ingredients_full` | Rich text | Ingredients accordion |
| `custom.how_to_use` | Rich text | How-to-use accordion |
| `custom.size` | Single line text | `50mL (1.69 oz)` |

Metafields rather than description HTML because they're structured: filterable,
exportable, and reusable by apps and by any future channel.

---

## Payments, shipping, tax (Canadian setup)

- **Shopify Payments** - lowest rate, and it's what enables **Shop Pay**, which
  is the fastest checkout available. Turn on **Apple Pay** and **Google Pay**.
- **Shop Pay Installments** - meaningful for a $139 bundle.
- **Taxes** - Shopify handles GST/HST/PST/QST by province automatically. Confirm
  your registration numbers are entered.
- **Shipping** - a flat rate plus free over your threshold is simpler and
  converts better than carrier-calculated rates, which add a checkout step and
  can surprise people with a number they didn't expect.

---

## Compliance worth doing properly

Cosmetics are a regulated category in Canada - this is not boilerplate.

- **Cosmetic Notification Form** to Health Canada for each product.
- **INCI ingredient lists**, bilingual (English/French), on packaging and ideally
  on the product page.
- **Bilingual labelling** is required federally; Québec's Charter of the French
  Language is stricter still. The theme is fully internationalised - add
  `locales/fr.json` and enable French in **Settings → Languages**. No Liquid
  changes needed.
- **Claims discipline.** "Dermatologically tested" and "clinically proven" need
  documentation you can produce. Avoid drug-adjacent claims ("treats acne",
  "reduces wrinkles") unless you hold the appropriate licence - those turn a
  cosmetic into a therapeutic product with a very different regulatory burden.
- **Privacy** - Shopify's cookie banner via **Customer Privacy**, configured for
  PIPEDA and Québec's Law 25.

---

## Launch sequence

1. Upload the theme, run `shopify theme check`
2. Create products, metafields and **The Ritual** collection
3. Create the bundle product and matching automatic discount
4. Configure Shopify Payments, express wallets, shipping, taxes
5. Install Judge.me and Klaviyo - nothing else yet
6. Set up abandoned-cart and welcome email flows
7. Run **Lighthouse** on mobile; target 90+ performance
8. Test a real purchase end to end on a real phone
9. Remove the storefront password
10. Submit the sitemap in Google Search Console

---

## What to watch after launch

| Metric | Healthy range | If it's low |
|---|---|---|
| Conversion rate | 1.5–3% (beauty) | Check mobile speed and PDP clarity first |
| Average order value | Above single-product price | The bundle and shipping threshold are the levers |
| Add-to-cart rate | 5–10% | PDP problem - imagery, benefits, price framing |
| Cart → checkout | 60%+ | Unexpected shipping cost is the usual culprit |
| Checkout → purchase | 60%+ | Enable more express wallets |
| Mobile LCP | Under 2.5s | Audit apps before touching the theme |
| Repeat purchase (90 day) | 20%+ | This is what subscriptions and email are for |

For a four-SKU brand, **AOV and repeat rate matter more than conversion rate.**
You have a naturally replenishing product in a fixed routine - that's a
subscription business waiting to happen, and it's where the margin is.
