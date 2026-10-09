# BZM clone forensic audit

Audit date: 2026-10-09
Reference root: `/Users/abusaimwahid/Desktop/website-clone`
Recording: `reference/bzm-reference.mov`

## Guardrails

The downloaded clone was treated as a read-only technical reference. No clone script was executed, imported, copied, or shipped. The audit used filename inventory, static HTML/CSS/JavaScript inspection, media metadata, and the owner-provided recording. PicVisual keeps its own brand, copy, data, routes, and media.

## Inventory

- 404 files, 146 MB total
- 134 HTML, 96 JavaScript, 3 CSS
- 109 JPEG, 29 PNG, 12 WebP, 4 GIF, 9 WOFF2
- Public experience: `bzmgraphics.com`
- Ancillary captures: `www.bzmgraphics.com`, `career.bzmgraphics.com`, `deck.bzmgraphics.com`, `profile.bzmgraphics.com`, and `upload.bzmgraphics.com`
- 22 relevant public route families were identified: home, work, about/studio, services, seven service-detail routes, 3D/CGI, contact, booking, FAQ, pricing, blog, careers, and legal/support routes.

The recording is H.264, 1920 x 1080, and 148.738333 seconds long. Its nominal source rate is 600 fps and average decoded rate is approximately 56.97 fps.

## Technology evidence

- Next.js App Router output (`_next/static/chunks/app/...`)
- React client components and hooks
- Tailwind CSS 4.1.18
- Motion/Framer-style primitives: scroll progress, transforms, motion values, and presence transitions
- Lenis 1.3.17, instantiated once after idle with a two-second duration, `wheelMultiplier: 0.8`, `touchMultiplier: 1.5`, and exponential easing
- Lenis is skipped for `prefers-reduced-motion: reduce` and destroyed during cleanup
- Native CSS sticky positioning owns the long scenes; no GSAP or ScrollTrigger signatures were found
- `requestAnimationFrame`, `ResizeObserver`, and `IntersectionObserver` are used to keep measurements and transforms outside React render loops
- Main responsive handoff is at 768 px, with additional 1024, 1280, and 1536 px refinements

## Reference palette and typography

- Dark navy: `#06243f`
- Light paper: `#faf9f6`
- Cream: `#f8f6ee`
- Warm footer: `#efefe9`
- Reference accent: `#c7ea46`
- Reference fonts: Geist and Castoro

PicVisual will not ship these font files or the reference accent. Its equivalent system uses the project fonts and `#26AAE1` strictly as an accent.

## Homepage choreography map

### 1. Fixed navigation and progress

The navigation floats above the page at a high stacking level. A fixed three-pixel progress line spans the top edge and updates through one requestAnimationFrame-throttled listener. The reference menu expands from its control with a circular clip transition, locks body scroll, and dismisses on backdrop or close. PicVisual will use a full-viewport accessible version with the same strong open/close ownership.

### 2. Hero

- Mobile height: 50vh
- Desktop height: 100vh
- Full-bleed media with cover cropping
- Oversized lower-left title and compact lower-right supporting copy
- Bottom ticker creates the first horizontal movement before the page leaves the hero
- Media remains natural; contrast is supplied only by localized text gradients

### 3. Mission statement

- Normal-flow light section
- Twelve-column desktop grid: four columns for the label and eight for the statement
- One-time entrance: small vertical offset, subtle blur, and shallow X rotation settle into place in roughly 350 ms

### 4. Capability showcase

- Outer section: 400vh
- Inner stage: sticky, top zero, 100vh, overflow hidden
- Category rail remains at the top of the stage
- Horizontal track travel is measured as `scrollWidth - viewportWidth`
- Normalized section progress from 0 to 0.9 maps to physical track translation from zero to negative maximum travel
- Category selection maps back to the matching vertical scroll point
- Regular panels measure approximately 85vw on mobile, 45vw at medium widths, and 40vw on large screens
- Media hover scales from 1 to 1.1 over two seconds while title, description, and tags enter in a 0/100/200 ms sequence
- The final panel occupies a full viewport and changes ownership to a split media/editorial workflow composition
- A local six-pixel progress line communicates movement through the stage

### 5. Marquee bridge

Three continuous rows alternate direction at approximately 100, 120, and 140 seconds. They pause on hover. The reference uses client marks; PicVisual will use truthful capability language unless verified CMS client identities exist.

### 6. Services stage

- Outer section: normal height on mobile, 140vh on desktop
- Desktop inner stage: sticky, top zero, 100vh
- Four equal columns fill the presentation area
- Hovered column grows from flex 1 to flex 2 over one second with a strong ease-out curve
- Static imagery stays visible at rest; motion media, title, and explanatory copy gain prominence only for the active column
- Mobile becomes a readable sequence with a minimum card height near 480 px

### 7. Proof bridge

A normal-flow editorial proof/testimonial section resets scroll rhythm between two immersive stages. Only verified PicVisual proof may appear.

### 8. Selected work

- Mobile: conventional two-column or single-column flow with no sticky choreography
- Desktop outer section: 600vh
- Inner stage: sticky, top zero, 100vh
- Left 70% contains two vertical galleries; right 30% reserves editorial breathing room
- First column moves approximately `15%` to `-65%` over progress 0 to 0.85
- Second column moves approximately `-15%` to `65%` over the same interval
- Editorial heading shifts right and scales to 0.85 during the opening 15%, then fades from progress 0.75 to 0.9
- Gallery begins at scale 1.15, settles to 1, and finally expands toward 5 while blur and opacity complete the handoff
- A dark split finale reveals through a circular clip from progress 0.65 to 0.98
- Supporting copy changes by progress band without forcing React renders on every frame

### 9. CTA and FAQ

A split visual/editorial CTA restores normal document flow. FAQ follows as a large left heading with an accessible accordion on the right.

### 10. Why section and footer handoff

- Desktop wrapper: 200vh
- Foreground dark scene: 100vh and sticky/absolute above the footer
- Foreground translates upward by one viewport, scales from 1 to 0.9, rounds toward 32 px, and fades late in the sequence
- Background media settles from scale 1.15 to 1 during the first half
- The warm, full-screen footer remains beneath and takes visual ownership as the foreground clears
- Mobile returns to normal flow

## Inner-page language

The clone's work, services, studio/about, and contact routes use the same oversized editorial type, twelve-column layouts, clipped media, restrained accent bars, and full-scale footer. PicVisual should harmonize its existing public routes through shared tokens and shell components, without moving or changing CMS, authentication, database, Cloudinary, or admin behavior.

## Non-transfer statement

No BZM image, video, logo, copy, source file, font file, proprietary name, statistic, testimonial, or client claim is approved for production use. The permitted output is an independent PicVisual implementation of the measured layout and motion principles.
