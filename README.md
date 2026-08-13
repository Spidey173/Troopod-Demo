# Purelane Dawn Theme

A premium, highly interactive Shopify theme built for the Purelane brand. Derived from Shopify's Dawn/Skeleton foundations, it brings custom glassmorphism visual design systems, fluid water-parallax physics, interactive card quantity steppers (`[ − ]  1  [ + ]`), a glassmorphic Cart Drawer, and a floating checkout bottom bar, all fully manageable through the standard Shopify Customizer.

---

## 🚀 Getting Started & Build Notes

### Prerequisites
- [Shopify CLI](https://shopify.dev/docs/api/shopify-cli) (latest version)
- Shopify Development Store (or sandbox environment)

### Local Development Preview
1. Clone this repository to your local workspace.
2. Authenticate and start the Shopify CLI development server:
   ```bash
   shopify theme dev
   ```
3. Open the provided Localhost preview URL or Admin Editor URL.

### Build & Deploy Notes
- **Direct Zip Import**: If deploying directly to an Admin panel without git/CLI setup, import the pre-built theme package: [`purelane-dawn-theme.zip`](./purelane-dawn-theme.zip).
- **Asset Separation**: Core styling is compiled in [`assets/purelane.css`](./assets/purelane.css) and JavaScript enhancements reside in [`assets/purelane.js`](./assets/purelane.js) for clean code modularity and maintainability.

---

## 🗄️ Metafields & Metaobjects Configuration

To dynamically control content structure for advanced sections, we designed the following definitions to extend Shopify standard data models:

1. **Product Metafields (Namespace: `purelane`)**:
   - `ingredients_list` (`list.single_line_text_field`): Highlighted botanical active ingredients for clean display on product cards.
   - `usage_instructions` (`multi_line_text_field`): Step-by-step custom guide on the product page.
2. **Metaobjects (Type: `ingredient_item`)**:
   - Used for dynamic rendering in the **Ingredients Showcase Grid**:
     - `name` (`single_line_text_field`)
     - `description` (`single_line_text_field`)
     - `svg_icon` (`multi_line_text_field`): Custom raw SVG markup to maintain high-performance, pixel-perfect illustrations without heavy rasterized image files.

---

## 📝 Design Audit: Original HTML vs. Production Shopify Theme

### What was wrong with the original static HTML (`purelane-homepage.html`)?
1. **Performance & Page Weight**: Inline vector animations and all visual components were embedded in a single file (>150KB), creating poor parsing speeds and rendering blockades.
2. **Accessibility Deficiencies**: Many dynamic interactive items lacked keyboard focus indicators (`outline`), semantic tags (`main`, `section`, `header`), or appropriate `aria-*` parameters.
3. **Responsive Breakpoints**: Breakpoints were set in rigid pixels that broke layouts on mid-tier viewports (e.g. tablets, 375px small screens).
4. **Hardcoded Content**: All product cards, reviews, pricing, discounts, and combo packages were statically hardcoded, leaving store merchants unable to modify pricing or inventory.

### What we changed and why:
- **Modular Component Breakdown**: We modularized the static code into reorderable Liquid sections (Hero, Shop Grid, Combos, Bundles, Ingredients, and Reviews) so merchants can add, remove, and reorder sections easily.
- **Shopify Storefront API Integration**: Bound all product components to real Shopify product data (`title`, `price`, `compare_at_price`, and image objects) with automatic fallback SVG placeholders.
- **Live Stepper & AJAX Cart**: Replaced mock buttons with actual asynchronous cart actions. Clicking "Add to cart" instantly mutates to a stepper pill (`[ − ]  1  [ + ]`), increments asynchronously using Shopify's API (`/cart/add.js`), and automatically updates the Cart Drawer and floating bottom notification bar without refreshing.

### What we'd improve with more time:
- **Section CSS Splitting**: Break the main `purelane.css` stylesheet into section-specific CSS files (`sections.hero.css`, etc.) using Shopify's defer loading to improve initial paint performance.
- **Localized Schema Fields**: Implement translation strings (`t:`) for all merchant customizer schemas to allow painless multilingual editing.

---

## 🤖 AI Workflow & Systematization Notes

We collaborated with agentic AI tools to build, test, and package this Shopify storefront.

### What we used AI for:
- Developing the structural schema frameworks (`{% schema %}`) for standardizing blocks and product settings inside the custom sections.
- Writing regression-free JavaScript loops for synchronous cart state mutations across three separate interface targets (product cards, drawer items, and the floating bottom bar).

### Where AI failed & How we fixed it:
- **State De-synchronization**: The AI initially struggled with keeping the card quantity stepper in sync when modifying the items directly in the Cart Drawer.
  * *Fix*: We implemented a global cart-listener pub/sub pattern in [`assets/purelane.js`](./assets/purelane.js) that fires whenever an AJAX operation succeeds, forcing every interactive cart component on the viewport to pull the new quantity states.
- **SVG Encoding Escapes**: AI generated XML schemas inside YAML settings blocks that broke the Liquid compiler.
  * *Fix*: Replaced schema inputs with clean Liquid text settings, validating layout schemas.

### Systematizing for 20+ Similar Projects:
To deliver high-velocity DTC landing pages at scale:
1. **Liquid Section Templates**: Create a scaffolding generator that automatically spins up customizable Shopify sections containing standardized accessibility inputs and responsive swipe tracks.
2. **Unified Cart Handler Class**: Develop a reusable NPM-packaged cart state manager that exposes custom DOM events (`cart:update`, `cart:add`), abstracting API requests away from design-specific JS files.
3. **Linting Rules**: Enforce custom `theme-check` rules that prevent inline hardcoded styles, ensuring visual systems remain tied to tailorable theme CSS variable frameworks.
