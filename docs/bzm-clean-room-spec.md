# PicVisual public experience — BZM clean-room specification

Date: 2026-10-05
Primary evidence: `reference/bzm-reference.mov` (1920×1080, 148.738 s, H.264)
Secondary evidence: publicly observable pages on `https://www.bzmgraphics.com/`
Method: visual observation only. No BZM source, bundles, stylesheets, fonts, copy, or media are used by PicVisual.

## 1. Route map

The live reference exposed 21 internal route patterns during the audit. Four route families were visually inspected at desktop and mobile (`/`, `/services`, `/about`, `/contact`); the remaining public links were inventoried to understand navigation and feature coverage.

| Reference route or family | Observable purpose | PicVisual counterpart | Decision |
| --- | --- | --- | --- |
| `/` | immersive public overview | `/` | reproduce chapter rhythm with PicVisual content |
| `/works` | portfolio archive | `/work` | preserve PicVisual route; use editorial media stream |
| `/about` | identity, principles, journey, people | `/about` | use truthful studio, approach, capabilities, workflow |
| `/services` | four capability families | `/services` | use published PicVisual services, no invented scale claims |
| `/services/ecommerce-post-production` | photo service detail | no forced new route | existing service content remains CMS-ready; overview is sufficient until detail architecture is approved |
| `/services/video-editing` | video detail | no forced new route | same as above |
| `/3d-and-cgi` | CGI detail | no forced new route | same as above |
| `/services/background-remove` | specialist service detail | service item inside `/services` | do not create thin SEO clones |
| `/services/clipping-path` | specialist service detail | service item inside `/services` | do not create thin SEO clones |
| `/services/color-correction` | specialist service detail | service item inside `/services` | do not create thin SEO clones |
| `/services/editorial-retouching` | specialist service detail | service item inside `/services` | do not create thin SEO clones |
| `/services/ghost-mannequin` | specialist service detail | service item inside `/services` | do not create thin SEO clones |
| `/contact` | contact form and direct contact | `/contact` | preserve PicVisual enquiry backend |
| `/book-a-meeting` | meeting conversion | `/contact` | one truthful conversion route |
| `/faq` | questions | homepage FAQ | retain CMS-driven accordion |
| `/pricing/image-editing` | BZM pricing | none | excluded; no approved PicVisual pricing |
| `/blog` | editorial content | none | excluded until PicVisual has real editorial content |
| `/privacy-policy` | privacy | `/privacy` | preserve PicVisual policy |
| `/terms-and-conditions` | terms | none | do not fabricate legal copy |
| `/cookie` | cookie policy | covered by `/privacy` | site currently has no advertising trackers |
| `/refund-policy` | refund policy | none | excluded; no approved policy |

PicVisual routes that remain in scope and must share the system: `/`, `/work`, `/work/[slug]`, `/case-studies`, `/case-studies/[slug]`, `/services`, `/about`, `/contact`, `/privacy`, and the not-found state.

## 2. Homepage chapter map

| Chapter | Reference composition | PicVisual implementation rule |
| --- | --- | --- |
| opening / hero | near-full-viewport media, compact fixed header, large lower-left statement, small lower-right proof block | full-bleed PicVisual media, large two-line headline, compact actions, no tint over the photograph |
| identity statement | warm-white editorial statement followed by a full-width segmented image field | “Your production partner after the shoot” with one dominant and three compressed supporting frames |
| category field | one continuous horizontal field; category ownership moves by panel width and crop | Image Post, Motion/Video, Product/Jewelry, Creative/CGI; one dominant panel at a time |
| dark handoff | a dark, media-led statement interrupts the light field | one PicVisual workflow statement and one dominant production visual; no fake software UI |
| services | large heading above four tall panels; active panel expands while neighbours remain visible | published service data populates four tall media panels; hover, focus, click and scroll can change ownership |
| social-proof rhythm | reference uses a real quote | render only real published PicVisual testimonials; otherwise use a truthful workflow bridge |
| selected work | evolving collage/canvas, oversized integrated title, changing crops and edge entries | CMS projects replace sample concepts automatically; never a standard equal card grid |
| project-to-CTA handoff | project canvas geometrically resolves into a large two-part CTA | use a controlled full-width split, deep navy copy side and sky-blue/media side |
| FAQ | large editorial heading plus spare accordion rows | CMS order, native buttons, visible focus, short height transition |
| trust close | dark full-width trust field with large identity type and one background image | truthful PicVisual craft, consistency, collaboration; no statistics or certifications |
| footer | oversized editorial footer, large navigation and contact hierarchy | PicVisual logo/contact/routes only; no BZM offices, logos or data |

## 3. Desktop geometry map

Measurements are normalized to the page viewport visible in the recording. They are target ranges, not copied pixel values.

| State | Dominant visual geometry | Text geometry | Supporting geometry |
| --- | --- | --- | --- |
| hero | x 0–100%, y 0–100%, cover crop; subject bias follows focal point | lower-left, x 3–5%, width 42–55%, headline about 7–10vw | compact proof/meta at right; header overlays top 6–8% |
| positioning | headline occupies x 4–58%, top quarter; field begins below copy | body x 66–93%, width 24–30% | media field spans 92–100% width |
| category field | four panels fill about 92–96vw; active panel 38–48%, neighbours 16–22% | active copy anchored inside lower quarter | optional detail crop 18–28% of active panel |
| workflow handoff | single image 55–72vw or one 50/50 composition | statement 28–42vw, vertically centred | no more than one small support image |
| services | four panels fill 92–96vw; active 36–44%, neighbours 18–24% | heading above field; titles inside lower panel | panel crop shifts 5–10% during ownership change |
| selected work | dominant project 48–67vw; support images 18–34vw at edges | title occupies 30–48vw and may overlap negative space, never obscure focal subject | maximum one dominant plus two context visuals |
| split CTA | about 50/50, 72–92svh | copy side uses 9–13ch headline | media/brand side owns the other half |
| trust | full-width dark field, 75–100svh | large left or right identity headline | at most one background photograph plus three truthful text cells |
| inner-page hero | 100svh, 38–45% copy and 55–62% media | 6–9vw display type | secondary crops limited to one or two deliberate details |

Global desktop gutters range from 2.5vw in immersive fields to 6–8vw in reading sections. Full-width creative chapters must not inherit a single narrow container.

## 4. Motion timing map

The detailed recording map is in `docs/bzm-motion-timing.md`. Global behavior:

- native document scroll remains authoritative;
- CSS sticky owns long desktop chapters;
- GSAP/ScrollTrigger maps progress to transforms and clipping, not page pinning;
- active primary media remains at opacity `1`;
- each ownership state follows **change → resolve → hold**;
- roughly 20–30% of a state is change and 70–80% is readable resolution/hold;
- reverse input must produce the exact inverse state without catch-up;
- mobile simplifies to vertical flow when sticky ownership harms touch responsiveness.

## 5. Header behavior

- Fixed, compact bar above immersive scenes.
- Transparent/low-contrast at the top of a dark or photographic hero; warm-white surface after leaving the hero.
- PicVisual logo remains an undistorted image asset.
- Desktop primary navigation: Work, Services, Studio, Contact; CTA: Start a Project.
- Hover uses an underline/arrow movement and PicVisual blue, not a large background effect.
- Mobile opens a right-side or centred high-contrast panel over a dimmed page, locks document scroll, moves focus to the first link, traps Tab, closes on Escape and restores focus.

## 6. Mobile behavior

- Header height about 62–68px.
- Hero is media-first but content remains readable without relying on hover.
- Immersive desktop panel rails become ordered 4:5 or 3:4 media blocks with large headings.
- No horizontal overflow, transformed off-screen focus targets, or fixed-height text clipping.
- Images remain at natural color and full opacity.
- Selected Work becomes a staggered editorial stream, not equal cards.
- CTA stacks copy before media; footer navigation becomes a strong vertical list.
- Reduced-motion mode shows final resolved layouts immediately.

## 7. Services behavior

- Four service families share one nearly full-width visual canvas on the homepage.
- Desktop active width target: 2.1–2.4 times an inactive panel.
- Ownership can be changed by scroll, pointer hover, click or keyboard focus.
- Copy stays inside its media panel with adequate contrast from a local lower gradient only.
- `/services` uses a large visual intro followed by alternating editorial service chapters populated from published CMS services.
- No BZM capacity, turnaround, ISO or client statistics are reproduced.

## 8. Selected-project behavior

- The homepage presents one evolving project canvas.
- State A: first work dominates; one support visual previews the next state.
- State B: prior visual compresses and moves outward; next visual grows inward; a third may enter from an edge.
- Subsequent states retain the same geometry vocabulary so ownership is unambiguous.
- Project text follows the dominant visual; inactive project copy is subordinate but not replaced with a blank viewport.
- CMS projects link to `/work/[slug]` or `/case-studies/[slug]`; demo concepts retain `SAMPLE`/`CONCEPT` disclosure.
- `/work` uses large alternating media; details use hero, overview, story, gallery, notes/outcome, next project and CTA when content exists.

## 9. CTA behavior

- Full-width and visually consequential, never a small banner.
- Desktop split approximates 50/50 and 75–92svh.
- Deep navy contains PicVisual conversion copy; sky blue or a clear PicVisual media composition owns the partner side.
- Buttons use real configured links and retain visible focus.

## 10. FAQ behavior

- Editorial heading occupies about one-third of the desktop width; accordion occupies the rest.
- Rows use native buttons with `aria-expanded` and `aria-controls`.
- Opening a row changes height/visibility over about 220–320ms; no scroll-jacking.
- Keyboard activation and focus ring are mandatory.

## 11. Trust section behavior

- Dark closing chapter with one dominant photographic anchor at opacity `1`.
- Truthful themes: careful visual craft, consistent delivery and clear collaboration.
- If real published testimonials exist, one may occupy the reference testimonial rhythm; otherwise the workflow/editorial bridge is used and no quote is fabricated.

## 12. Footer architecture

- Warm off-white or deep navy editorial surface, depending on preceding chapter.
- Large PicVisual logo mark, configured email and optional configured phone/location.
- Primary links: Work, Services, Studio, Contact, Privacy.
- Configured social links only.
- Copyright and short brand line at the final baseline.

## 13. Breakpoint behavior

| Range | Behavior |
| --- | --- |
| ≥ 1440px | full immersive geometry; 92–96vw media canvases; longest sticky ranges |
| 1280–1439px | same ownership model with reduced gaps/type and minimum panel widths |
| 1024–1279px | two-column inner heroes remain; sticky canvases shorten; touch-friendly controls |
| 801–1023px | editorial tablet grid; avoid four squeezed panels; no accidental horizontal rail |
| ≤ 800px | normal-flow mobile scenes; stacked media; no sticky section dependency |
| ≤ 430px | single-column typography and media with 20px gutters; menu fully touch accessible |

Required QA viewports: 1920×1080, 1440×900, 1280×800, 1024×768, 430×932 and 390×844.

## 14. Hover behavior

- Header links: subtle underline/blue accent.
- Buttons: small vertical lift or arrow translation; no large layout shift.
- Service panels: pointer ownership expands the panel and slightly reframes the image.
- Project links: image scales approximately 1.02–1.04 and metadata/arrow strengthens.
- Accordion rows: label becomes blue; focus-visible remains at least as clear as hover.
- Touch and keyboard receive equivalent states without hover dependency.

## 15. Transition behavior

- Media enters by travel, crop, scale, clip or panel footprint.
- Primary photography does not enter through a prolonged low-opacity state.
- Typical local transition is 220–420ms; the resolved hold is substantially longer.
- Section handoffs share an edge, background or media anchor so one chapter visually produces the next.
- Background changes occur at chapter boundaries, not as full-image color filters.
- No Lenis. No GSAP pin. CSS sticky may be used on desktop only where the reference clearly holds a canvas.

## Interaction inventory

Observed public interaction types (12): fixed/scrolled header, desktop navigation, mobile menu, CTA buttons, category ownership, service-panel ownership, project-canvas progression, project-link hover, FAQ accordion, comparison range control equivalent, footer links, and form controls. PicVisual implements an equivalent only where truthful content and an existing route exist.

## Clean-room content boundaries

Never reproduce BZM names, logos, green/lime identity, photographs, video, client marks, quotes, statistics, locations, awards, certifications, marketing copy, metadata, source code or downloaded runtime assets. PicVisual uses `#26AAE1` as an accent and its own existing CMS, media, content and demo assets.
