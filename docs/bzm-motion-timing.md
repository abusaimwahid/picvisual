# BZM reference motion timing map

Source: `reference/bzm-reference.mov`
Resolution: 1920×1080
Duration: 148.738 seconds
Frame analysis: 298 JPEG frames extracted at 0.5-second intervals to `/tmp/picvisual-bzm-parity/reference-frames/`.

The recording includes browser chrome and human pauses. Time ranges describe observable states, not a requirement to reproduce the recording's absolute duration. PicVisual maps these ratios to native scroll distance.

## Recording timeline

| Time | Route / chapter | Observable enter | Resolved active state | Exit / handoff | PicVisual normalized mapping |
| --- | --- | --- | --- | --- | --- |
| 00–06 s | home loader / opening | lime field resolves through a minimal centre mark and dark bridge | hero media becomes full viewport | media and brand field alternate into stable hero | load only; PicVisual avoids a blocking imitation loader |
| 06–14 s | hero | full-bleed imagery changes crop while headline/meta stay anchored | media owns almost the whole viewport; statement sits lower-left | bottom edge gives way to warm-white identity | 0–6% homepage scroll; hero sticky window about 175svh |
| 14–18 s | identity statement | headline rises into upper/middle left; body appears at right | high-confidence type plus generous white space | segmented media field enters from bottom | 6–10%; short change then readable hold |
| 18–24 s | multi-media categories | adjacent images occupy equal-to-variable columns | one category expands while neighbours remain present; crop and labels change | final panel resolves into a dark workflow field | 10–23%; four owner states with about 72% hold each |
| 24–28 s | workflow / brand bridge | dark field and statement replace the light image field | one dominant visual and one large statement | warm-white services heading rises in | 23–29%; one resolved dark state |
| 28–32 s | services | four tall panels enter together | active panel expands to about twice neighbour width; titles remain inside | testimonial rhythm / editorial bridge | 29–42%; four owner states |
| 32–40 s | selected project gallery | first tall project enters left while oversized title occupies right | dominant project changes through large repositioning; support crops enter at edges | geometry compresses toward split CTA | 42–61%; six project states where available |
| 40–44 s | split CTA | prior gallery shapes overlap/resolve into two halves | navy statement on left, saturated media/brand half on right | right half yields to warm-white FAQ | 61–67%; 80–95svh chapter |
| 44–48 s | FAQ | first rows appear at centre/right | spare white accordion list, one row emphasis at a time | lower edge darkens into trust | 67–76%; normal document flow |
| 48–50 s | trust | dark photographic field enters | statistics/identity in reference; PicVisual uses truthful trust themes only | photograph clears to footer surface | 76–82%; short full-width dark state |
| 50–56 s | footer | logo/contact columns settle | large editorial navigation/contact architecture | menu overlay is invoked | 82–100%; normal flow |
| 56–58 s | global menu | page dims and lime menu panel travels from right | large vertical route list, close control and social links | route navigation to Services | interaction, not scroll |
| 58–68 s | Services intro | large type and triple media strip enter | service family index plus continuous media band | capability statement and first chapter | route-local 0–18% |
| 68–82 s | Services capabilities / work field | alternating service copy and media enter | large media grids, editorial copy, category tabs | skeleton/route handoff visible in recording | route-local 18–88% |
| 82–84 s | route transition | muted overlay/load state | no prolonged content ownership | About route resolves | route transition only |
| 84–90 s | About identity / philosophy | large identity line and wide team media | statement alternates with media-led identity | team collective enters | route-local 0–28% |
| 90–98 s | About people / values | wide people visual and supporting frames | principles form a six-cell editorial matrix | journey cards enter horizontally | route-local 28–55% |
| 98–104 s | About journey | large time cards travel horizontally | three to four milestones visible simultaneously | careers/identity bridge | route-local 55–78%; PicVisual replaces with truthful workflow/history only if approved |
| 104–112 s | About closing / footer | careers and leaders appear in reference | PicVisual uses studio workflow, capabilities and CTA, without fabricated people | footer resolves | route-local 78–100% |
| 114–126 s | Contact | large “Talk” heading and visual enter; form follows | balanced form/media columns, then direct contact/footer | menu/footer close | route-local 0–100% |
| 126–148.7 s | footer/menu review | footer appears, menu opens | navigation panel holds without drift | recording ends | interaction audit |

## Scroll-state model for PicVisual

### Hero

- Enter: already resolved at load; no low-opacity photography.
- Active: crop scale approximately 1.04 → 1.0 while copy moves no more than 6vh.
- Handoff: media travels/scales into the next chapter edge; copy leaves before it can clip under the header.
- Target range: 175–220svh desktop; normal flow on mobile.

### Capability field

- Four owner states plus one proof state.
- Each owner unit: 0–18% change, 18–82% hold, 82–100% handoff.
- Active width about 2.35 flex units; inactive about 1.
- Image crop moves from scale about 1.06 to 1.015 as ownership arrives.
- Target range: 360–440svh desktop depending on available panels.

### Services

- Four states.
- Active width about 2.15 flex units; inactive about 1.
- Transition occupies no more than 28–32% of each state's distance.
- Pointer/focus/click update the same visual ownership without changing document scroll.
- Target range: 360–420svh desktop.

### Selected Work

- Up to six owner states, at least one truthful fallback state.
- One dominant visual remains fully opaque through each state.
- Transition changes x/y footprint, width, height and crop over 24–32% of the state.
- Copy arrives after geometry starts and resolves before geometry stops.
- Target range: 480–620svh for six states; scale by project count with a minimum readable hold.

### CTA, FAQ and trust

- These are normal document chapters, not long sticky timelines.
- CTA may use a short local crop shift of 4–7% across its viewport pass.
- FAQ height animation remains independent of scroll.
- Trust media moves no more than 3–5% and stays at opacity `1`.

## Human input acceptance targets

- Small trackpad/wheel input changes geometry slightly but cannot skip an owner state.
- Normal input advances predictably; the next state resolves before another can dominate.
- Fast input lands on a complete state without lingering intermediate opacity or delayed catch-up.
- Reverse input reconstructs prior states exactly.
- Direct scrollbar positioning and Home/End resolve the correct absolute state.
- Native browser scrolling remains responsive; no Lenis controller is introduced.

## Reduced motion

At `prefers-reduced-motion: reduce`, all sticky timelines are disabled or reduced to immediately resolved geometry. Content order, media, links and controls remain complete and readable.
