# BZM-to-PicVisual rebuild map

This map translates the read-only clone evidence into PicVisual's existing public application. It does not alter the admin workspace, CMS contracts, authentication, database, Cloudinary integration, or media model.

## Source-of-truth mapping

| Reference role | PicVisual source | Implementation target |
| --- | --- | --- |
| Brand mark | `public/brand/picvisual-logo.png` | Existing public header and footer |
| Accent | PicVisual `#26AAE1` | Lines, active states, small labels, focus rings |
| Hero media and copy | Homepage CMS response with existing fallback content | Full-bleed hero |
| Capability panels | Homepage sections and existing service/demo media | 400vh horizontal showcase |
| Services | Published service records | 140vh four-column stage and services routes |
| Proof/testimonials | Enabled CMS records only | Bridge section; hidden if empty |
| Selected work | Published project records | 600vh desktop gallery and mobile flow |
| Client strip | Enabled CMS client records only | Logos when verified; otherwise capability marquees |
| FAQ | Enabled CMS FAQ records | Accessible accordion |
| Contact information | Site settings/CMS | CTA, footer, contact route |

## Shared shell

- Retain the current Next.js application and route/data boundaries.
- Rebuild the public header as a fixed mark plus menu pill, fixed three-pixel page progress, and an accessible full-screen overlay.
- Overlay requirements: focus enters the dialog, Tab remains trapped, Escape closes, navigation closes it, background scroll locks, and focus returns to the trigger.
- Rebuild the public footer as a warm-light, near/full-viewport editorial destination using real PicVisual contact details.
- Apply the public visual tokens to `/work`, `/services`, `/about`, `/contact`, and project/service detail routes without touching the admin shell.

## Homepage ownership sequence

1. `50vh / 100vh` hero
2. Normal-flow twelve-column mission
3. `400vh` horizontal capability stage
4. Three normal-flow capability marquees
5. `140vh` desktop services stage
6. Truthful proof bridge, conditional on real records
7. `600vh` desktop selected-work stage; normal mobile flow
8. Split CTA
9. Normal-flow FAQ
10. `200vh` desktop why/footer handoff
11. Warm-light full-screen footer

Each viewport has one obvious owner. Sticky elements are bounded by their parent section, no fixed media survives its scene, and deliberate breathing room is kept short enough that it cannot read as a blank viewport.

## Motion implementation

- Use one optional Lenis instance because the clone and current PicVisual dependencies support it.
- Initialize only on fine-pointer, non-reduced-motion environments after the page is interactive.
- Keep native browser scroll as the source of truth; Lenis only interpolates it.
- One requestAnimationFrame scheduler reads section geometry and writes CSS transforms/progress variables.
- Use CSS sticky for scene ownership. Do not use GSAP pinning or ScrollTrigger.
- Recalculate physical horizontal travel and section bounds through `ResizeObserver` and resize events.
- Never update React state on every scroll frame. State changes are limited to coarse active-panel changes and user interactions.
- Reduced motion disables Lenis, sticky choreography, marquees, and nonessential transforms while preserving complete content access.

## Responsive map

| Width | Behavior |
| --- | --- |
| 1536+ | Full choreography, generous gutters, constrained editorial lines |
| 1024-1535 | Full choreography with narrower panels and type clamps |
| 768-1023 | Horizontal stage retained only when physical travel is valid; services/work simplify |
| Under 768 | 50vh hero, normal-flow capability/services/work/why sections, no sticky dependency |

Required viewport verification: 1920x1080, 1440x900, 1280x800, 1024x768, 430x932, and 390x844.

## Three-pass delivery

### Pass 1 — structure

- Recompose homepage markup into the measured scene order.
- Implement exact desktop scene heights and mobile fallbacks.
- Connect only PicVisual CMS/fallback data and media.
- Rebuild public header/menu/progress and footer ownership.

### Pass 2 — motion

- Implement measured horizontal translation, category-to-scroll mapping, services expansion, counter-scrolling work columns, and why/footer handoff.
- Add Lenis within the restrictions above.
- Validate wheel, trackpad, keyboard, touch, anchor navigation, resize, route transition, and menu locking.

### Pass 3 — polish

- Correct crop, scale, type rhythm, panel widths, gutters, timing, and scene handoffs against the owner recording.
- Remove any blue/navy cast from primary media.
- Harmonize public inner pages through shared presentation tokens.
- Verify reduced motion, console/runtime cleanliness, and production build.

## Comparison protocol

- Capture the rebuilt homepage at 0%, 2.5%, 5%, and every additional 2.5% through 100% (41 points).
- Build a contact sheet paired against frames extracted from the 148.738333-second reference recording at the corresponding normalized positions.
- Record one normal-speed interaction and one 0.5x review render.
- Inspect all six required viewport sizes and the public route matrix.
- Report differences honestly; structural and temporal correspondence matter more than copying decorative assets.

## Explicit exclusions

- No BZM assets, source, copy, fonts, logos, statistics, testimonials, or client identities
- No fake editing interface
- No admin, CMS, auth, database, or Cloudinary redesign
- No GSAP pin or ScrollTrigger
- No commit, push, or deploy
