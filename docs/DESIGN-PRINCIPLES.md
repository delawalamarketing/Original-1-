# Original 1% - Design Principles

Conversion-focused design decisions for the storefront, and the reasoning behind
each. Written to be argued with - where a rule doesn't fit, the reason is stated
so you can judge the trade-off yourself.

---

## 1. The brand already told us what to do

The palette wasn't invented; it was sampled from the packaging and the logo
lockup. Bone `#E4E2DD` is the carton backdrop, sage `#99BA8F` is the logo mark
fill, teal `#469D99` is the ring, forest `#304824` is the carton, brass
`#B27409` is the "Boost your skin's radiance" pill.

**Why it matters:** when a shopper moves from an Instagram ad to the site to the
box on their doorstep, three different greens read as three different companies.
One palette across all three reads as one brand that has its act together - and
on a premium price point, that perception *is* the product.

**Rule:** never hard-code a hex in a section. Everything flows from CSS custom
properties written once from theme settings.

---

## 2. Sell the ritual, not four bottles

This is the single most important decision in the build.

Four SKUs on a grid is four independent decisions, each with its own chance to
end in nothing. The same four presented as **Step 0 → 1 → 2 → 3** is one
decision - *start the ritual* - with a natural upgrade to the full set.

The numbering also answers the question every skincare shopper asks silently and
almost never types into search: **what goes on first?**

> Numbered markers are a design cliché when they decorate. Here the sequence is
> real information the shopper needs, which is the only thing that earns them.

**Practical effects:**
- Homepage leads with the four-step system, not a product carousel.
- The bundle is a first-class section, not a footnote.
- Product pages cross-sell the *other steps*, filtered so the product being
  viewed never appears in its own recommendations.

---

## 3. Above the fold, answer "what is this?" before "buy now"

The hero headline was split at its natural rhetorical beat:

- **H1:** *Imagine this. A luxurious fusion of nature's finest ingredients.*
- **Sub:** *Meticulously crafted by experts in a certified Canadian facility,
  formulated without parabens, and beautifully packaged in eco-friendly Italian
  glass bottles.*

Every word of the original line is preserved. But a 34-word H1 is unreadable at
a glance and disastrous for SEO. Splitting it gives a headline the eye can take
in one movement, with the substantiating detail immediately underneath.

**Rule of thumb:** an H1 should be readable in under two seconds. If it isn't,
you don't have a headline - you have a paragraph in a large font.

---

## 4. Put the objection next to the decision

A first-time buyer of a $33 toner from a brand they've never heard of forms four
objections, in this order:

1. Is this safe for my skin?
2. Is this a real company?
3. What if it doesn't work?
4. What's it going to cost me to find out?

The trust bar answers all four - certified Canadian facility, paraben-free,
cruelty-free and vegan, Italian glass, free shipping - and it appears on the
**home page, product page and collection page**, because the objection forms in
all three places, not just the first.

**Anti-pattern:** trust badges parked in the footer, where the objection has
already cost you the sale.

---

## 5. Reduce the cost of every click

- **Cart drawer, not a cart page.** A full-page redirect throws away the
  shopper's place in the browsing flow. The drawer keeps it.
- **Sticky add-to-cart.** Appears only *after* the real buy button scrolls out
  of view - never while the shopper is still above it, which would be a
  duplicate control competing with itself.
- **Express wallets** (Shop Pay, Apple Pay, Google Pay) on the product page.
  These skip the entire address and payment form. On mobile this is the single
  largest conversion lever available, and it costs nothing to enable.
- **Quick-add on cards** for single-variant products; multi-variant products
  route to the PDP instead of silently adding the wrong thing.

---

## 6. Use the free-shipping meter to change behaviour, not to decorate

The progress bar in the cart works because it converts *"should I check out?"*
into *"what should I add?"* - a much easier question.

**It only works if the threshold is set correctly.** Put it slightly **above**
your current average order value. Below it, every shopper clears it without
changing anything and you've simply given away shipping margin. It is currently
**$100**, which is between two and three of the four products.

---

## 7. Motion is a tool, not a personality

- Reveals on scroll are a single 18px rise with a fade, staggered ~80ms across
  siblings. Enough to feel considered; not enough to make anyone wait.
- No carousels in the announcement bar. A rotating message forces the shopper to
  wait for a line they've already half-read. One specific message beats three
  generic ones.
- `prefers-reduced-motion` disables reveals, the marquee and smooth scrolling.
  This is not optional - vestibular disorders are common, and motion sickness
  from a website is a real outcome.

---

## 8. Accessibility is conversion work

Every one of these has a commercial reading as well as an ethical one:

| Decision | Why it also makes money |
|---|---|
| 44 × 44px minimum tap targets | Mis-taps on mobile are abandoned sessions |
| Visible focus ring, never removed | Keyboard and switch users can complete checkout |
| Native radio inputs for variants | State survives a JavaScript failure |
| 15px minimum body text, 1.65 line-height | Ingredient lists are read by people over 40 |
| 4.5:1 minimum contrast | Screens are used outdoors, in sunlight |
| Drawers trap focus, close on Escape, restore focus | Nobody gets stranded mid-purchase |

Two real bugs were caught by checking this during the build: the primary CTA
label was rendering ink-on-forest at **1.77:1** because `.footer a` (specificity
0,1,1) was outranking `.btn` (0,1,0); and the eyebrow text was at **3.84:1**
against bone. Both are fixed. Contrast is now 9.6:1 and 4.64:1.

---

## 9. Performance is a design constraint

Every 100ms of load time is measurable revenue on mobile. The theme therefore:

- Serves fonts from Shopify's CDN via `font_face` - no third-party connection,
  no render-blocking stylesheet.
- Ships **one** CSS file and **one** JS file. No jQuery, no framework, no
  page-builder runtime.
- Lazy-loads everything below the fold; marks the hero and first product image
  `fetchpriority="high"`.
- Requests the cart drawer markup in the *same* round-trip as the add-to-cart
  mutation via the Section Rendering API, rather than fetching it afterwards.

**The biggest performance risk on this store is not the theme - it is apps.**
Each one injects scripts on every page. Audit them quarterly and remove
anything not earning its keep.

---

## 10. Write like a person

- "Free shipping in Canada" beats "Complimentary domestic delivery."
- A button says exactly what happens: **Add to cart** → toast says **Added**.
- Errors say what went wrong and what to do: *"We couldn't update your cart.
  Please try again."* - not *"An error occurred."*
- Benefits are in the shopper's words, not the lab's. **"Holds water in the skin
  so it stays plump through the day"** beats *"Sodium hyaluronate 1%."* Put the
  INCI list in the accordion for the people who want it.

---

## 11. Things to fix before you launch

These are in the build as realistic placeholders and **must** be replaced:

1. **Testimonials** are written as examples, not real reviews.
2. **"4.8 average from 320+ reviews"** is a placeholder. An untrue aggregate
   rating is a legal and platform-policy problem, not a matter of taste.
3. **Prices** in the demo content are illustrative.
4. **Claims** - "certified Canadian facility", "dermatologically tested",
   "clinically proven" - should match documentation you can produce on request.
   Health Canada and the FTC both take cosmetic claims seriously.
5. **A real landscape hero photo.** The preview composites one from your existing
   product photography as a stand-in; it's worth shooting properly.

---

## 12. What to test first

Don't A/B test button colours. Test decisions, in this order:

1. **Bundle price point** - the largest AOV lever you have.
2. **Free-shipping threshold** - directly changes basket size.
3. **Hero headline** - the split version against a shorter benefit-led line.
4. **PDP benefit order** - lead with hydration vs brightening.
5. **Subscribe & save discount** - 10% vs 15% vs 20% against retention.

Wait for statistical significance. At early-stage traffic, most "wins" are noise,
and a test you stop early is worse than no test at all.
