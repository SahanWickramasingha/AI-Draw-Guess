# AGENTS.md

## Project
AI Draw & Guess — OUSL Open Day 2026

This is an EXISTING React + Vite browser game.

Improve the current project IN PLACE.

Do NOT rebuild the application from scratch.
Do NOT replace the existing premium dark/neon/glassmorphism design.
Do NOT break the AI model, game logic, Supabase leaderboard, timer, scoring, wheel, drawing canvas, or Vercel deployment.

---

# CURRENT SUPABASE STATUS — IMPORTANT

The Supabase project is already connected and working.

The leaderboard table already exists:

```text
public.leaderboard
```

It already stores fields such as:

```text
id
name
score
total_time
created_at
```

RLS policies for public leaderboard read/insert already exist.

The Supabase 24-hour cleanup cron job is ALREADY CREATED and ACTIVE.

Current cron job:

```text
Name:
cleanup-leaderboard-24h

Schedule:
0 * * * *
```

Meaning:

```text
Runs every hour
```

Current cleanup command:

```sql
delete from public.leaderboard
where created_at < now() - interval '24 hours';
```

Therefore:

- DO NOT create a duplicate cron job.
- DO NOT rename the existing cron job.
- DO NOT change the existing Supabase project.
- DO NOT rotate/change the publishable API key.
- DO NOT change the Supabase URL.
- DO NOT require a new database.
- DO NOT require a new leaderboard table.
- DO NOT expose any secret/service-role key.
- DO NOT add secret keys to the frontend.

The frontend should simply respect this existing setup.

The frontend leaderboard query should ALSO show only rows from the last 24 hours as an extra safety filter.

---

# PRIMARY TASKS

Implement all of the following:

1. Full mobile/tablet responsiveness.
2. Add a Home button.
3. Add a Back button.
4. Improve the leaderboard dashboard.
5. Add a Top Ranked Winners section ABOVE the normal leaderboard.
6. Use proper ranking rules.
7. Respect the existing 24-hour Supabase retention setup.
8. Add a frontend last-24-hours leaderboard filter.
9. Make Eraser noticeably larger when selected.
10. Preserve all existing AI/game/Supabase functionality.

---

# NON-NEGOTIABLE RULES

- Do not remove existing working features.
- Do not redesign the desktop UI unnecessarily.
- Preserve the current dark futuristic neon design.
- Preserve OUSL Open Day branding.
- Do not modify AI model files unless explicitly asked.
- Do not re-add Monkey as a playable challenge.
- Do not break Vercel deployment.
- Do not create duplicate leaderboard score submissions.
- Do not change Supabase API keys.
- Do not change Supabase project URL.
- Do not add `sb_secret_...`, service-role, or database password to frontend code.
- Do not commit:
  - `node_modules`
  - `dist`
  - `.env`
  - secrets

Active playable challenge classes must remain:

```text
Car
Cat
Fish
House
Star
Lion
Scorpion
```

The model may still internally contain:

```text
other
monkey
```

These must NOT become playable targets.

---

# INSPECT BEFORE EDITING

Before making changes, inspect:

- `src/App.jsx`
- `src/styles.css`
- `src/components/`
- drawing canvas component
- wheel component
- leaderboard markup/component
- `src/utils/game.js`
- `src/utils/preprocessDrawing.js`
- `src/utils/supabaseLeaderboard.js`

Understand the existing screen/state flow before editing.

Reuse existing components, styles, and state wherever possible.

Do not guess the application structure.

---

# RESPONSIVE UI REQUIREMENTS

The app must work correctly at:

```text
1440px
1280px
1024px
768px
600px
480px
390px
360px
```

There must be NO horizontal page scrolling at normal zoom.

Recommended responsive breakpoints:

```css
@media (max-width: 1024px) {}
@media (max-width: 768px) {}
@media (max-width: 480px) {}
```

Prefer:

```text
width: 100%
max-width
min()
clamp()
CSS Grid
Flexbox
aspect-ratio
responsive gaps/padding
```

Avoid fixed pixel widths that overflow phones.

---

# DESKTOP

Keep the current desktop experience essentially unchanged.

Preserve:

- cinematic background
- neon effects
- glass cards
- wheel appearance
- canvas layout
- prediction/result panel
- leaderboard visual identity

---

# TABLET

At tablet widths:

- reduce excessive page padding
- scale wheel smoothly
- allow major columns to wrap/stack
- keep controls touch-friendly
- prevent clipped cards
- keep progress/stepper inside viewport

---

# MOBILE

Desktop layout such as:

```text
Canvas | AI Result
```

must become:

```text
Canvas
AI Result
Action Buttons
```

Stack major sections vertically where required.

---

# MOBILE HEADER

On mobile:

- reduce header padding
- keep branding readable
- allow wrapping
- prevent horizontal overflow
- keep Home/Back visible
- compact non-essential status text if necessary

---

# RESPONSIVE WHEEL

The challenge wheel must fit inside phone screens.

Preferred behavior:

```css
width: min(500px, 88vw);
height: min(500px, 88vw);
```

Do not allow wheel overflow.

Keep labels readable.

---

# RESPONSIVE DRAWING CANVAS

The visible canvas must fit phones/tablets.

Important:

- preserve mouse drawing
- preserve touch/pointer drawing
- preserve correct pointer coordinate mapping
- do not carelessly change internal canvas bitmap resolution
- scale visible canvas through CSS/container logic

Recommended:

```css
width: 100%;
max-width: 100%;
```

The canvas must remain usable at 360px viewport width.

---

# DRAWING TOOLBAR

Controls:

```text
Draw
Eraser
Brush Size
Clear
```

must:

- wrap correctly
- remain touch friendly
- not overflow horizontally
- use approximately 44px touch targets where practical

On narrow screens use stacked, 2-column, or full-width controls where appropriate.

---

# BIGGER ERASER REQUIREMENT

When Eraser is selected, use a noticeably larger erase width than the normal drawing brush.

Preferred behavior:

```text
Normal Draw:
Use current user-selected brush width.

Eraser:
Approximately 30px.
Acceptable range: 24px–36px.
```

Requirements:

- Clicking Eraser enables erase mode.
- Eraser stroke is clearly wider.
- Switching back to Draw restores the previous drawing brush size.
- Do not permanently overwrite the user's brush setting.
- Mouse erasing must work.
- Touch/pointer erasing must work.
- Keep erasing smooth.
- Do not break canvas scaling or pointer coordinates.
- Clear behavior must remain unchanged.

Optional:
show a larger eraser cursor/radius indicator only if it does not cause lag or mobile issues.

---

# HOME BUTTON

Add a Home button on appropriate screens:

- Player Setup
- Challenge / Wheel
- Drawing
- Result
- Final Score / Leaderboard

Do not show a redundant Home button on the actual Home screen.

Use the existing premium neon/glass design language.

---

# HOME BUTTON BEHAVIOR

When Home is clicked:

1. Return to the true landing/home screen.
2. Stop/cancel any active round timer.
3. Clear temporary round state safely:
   - selected target when appropriate
   - predictions
   - current drawing state
   - temporary result
4. Do NOT clear Supabase leaderboard data.
5. Do NOT clear remote scores.
6. Do NOT accidentally submit a score.
7. Do NOT create duplicate Supabase rows.
8. Avoid full-page browser reload unless truly required.

---

# BACK BUTTON

Add a Back button where a previous logical screen exists.

Do NOT blindly use:

```js
window.history.back()
```

unless proper route navigation already exists and is verified.

Prefer the existing screen/state navigation system.

Conceptual flow:

```text
Home
-> Player Setup
-> Challenge / Wheel
-> Draw
-> Result / Final
```

Expected examples:

```text
Player Setup -> Home
Challenge/Wheel -> Player Setup
Draw -> Challenge/Wheel only if current round is safely reset
Final -> safe previous stable screen or Home
```

---

# BACK BUTTON SAFETY

Back must NOT:

- duplicate a round
- submit score twice
- alter score incorrectly
- leave multiple timers active
- preserve stale predictions incorrectly
- corrupt selected challenge state
- create duplicate Supabase leaderboard rows

If leaving an active drawing round, cancel/reset that round cleanly.

---

# NAVIGATION BUTTON UI

Preferred:

```text
Back: top-left
Home: beside it or top-right depending on layout
```

On mobile:

- keep both accessible
- do not overlap timer
- do not overlap score
- do not cover stepper
- do not cover wheel/canvas

Use semantic `<button>` elements.

---

# LEADERBOARD DASHBOARD

Improve the existing leaderboard dashboard while preserving the current design.

Each leaderboard row should clearly show:

```text
Rank
Player Name
Score
Total Time
```

Example:

```text
#1  Sahan      3/3   18s
#2  Player B   3/3   22s
#3  Player C   2/3   15s
```

---

# TOP RANKED WINNERS SECTION

At the TOP of the leaderboard dashboard, add a premium Top Winners section.

Show at least Top 3:

```text
TOP CHALLENGE WINNERS

🥇 1. Sahan       3/3   18s
🥈 2. Player B    3/3   22s
🥉 3. Player C    3/3   27s
```

The Top Winners section MUST appear ABOVE the normal leaderboard list.

A podium/card layout is acceptable if it matches the current futuristic design.

---

# RANKING RULES

Ranking must be:

1. Highest score first.
2. If scores are equal, LOWEST total completion time wins.
3. If score and time are equal, earlier valid submission may rank first.

Example:

```text
Player A = 3/3, 20 sec
Player B = 3/3, 16 sec
```

Player B must rank above Player A.

Do NOT rank a lower score above a higher score merely because it is faster.

Supabase ordering should be equivalent to:

```text
score DESC
total_time ASC
created_at ASC
```

The Top Winners section and the normal leaderboard must use the SAME ordering.

---

# TOP 3 VISUAL HIGHLIGHT

Visually highlight:

```text
Rank 1
Rank 2
Rank 3
```

Use existing icon libraries where possible.

Keep styling premium and consistent with the existing neon/glass UI.

---

# LEADERBOARD MOBILE RESPONSIVENESS

At 360px width:

- Rank must remain visible.
- Player name must remain visible.
- Score must remain visible.
- Time must remain visible.
- Long names must wrap/truncate safely.
- No horizontal page overflow.

Useful CSS patterns:

```css
min-width: 0;
overflow-wrap: anywhere;
```

---

# SUPABASE 24-HOUR RETENTION — ALREADY ACTIVE

DO NOT create another cleanup cron job.

The existing Supabase cron already deletes leaderboard rows older than 24 hours.

Existing behavior:

```sql
delete from public.leaderboard
where created_at < now() - interval '24 hours';
```

Existing schedule:

```text
0 * * * *
```

Meaning:

```text
Every hour
```

Do not change this unless explicitly requested.

---

# FRONTEND 24-HOUR QUERY FILTER

Even though database cleanup is already active, frontend leaderboard reads should only return/show entries from the last 24 hours.

Add an appropriate Supabase/PostgREST filter based on `created_at`.

Conceptually:

```text
created_at >= current time minus 24 hours
```

This is only an extra safety filter.

Do NOT replace the real database cleanup with client-side hiding.

---

# SUPABASE CONNECTION — PRESERVE

Preserve the existing:

- Supabase project URL
- publishable browser key
- leaderboard table
- RLS policies
- shared leaderboard behavior
- localStorage offline fallback if currently implemented

Do NOT:

- rotate API keys
- create a new project
- create a new leaderboard table
- expose a secret key
- use a service-role key in the browser

---

# DUPLICATE SCORE PROTECTION

A completed game must create only ONE leaderboard entry.

React development mode, re-renders, Home, Back, Play Again, or navigation must NOT cause duplicate inserts.

Preserve or improve existing duplicate-submit protection.

---

# AI LOGIC — DO NOT BREAK

Preserve:

- Teachable Machine model loading
- 224x224 input preprocessing
- crop
- center
- padding
- resize
- minimum drawing-detail validation
- confidence threshold
- top1-top2 margin logic
- `Other` rejection
- Monkey rejection if model still contains Monkey internally
- case-insensitive target matching

Do not alter predictions simply to make demos look better.

---

# GAME LOGIC — DO NOT BREAK

Preserve:

```text
3 rounds
20-second drawing timer
non-repeating challenge selection
score calculation
result transitions
final score
Play Again / restart flow
```

Responsive changes must not alter gameplay logic.

---

# BUTTON RESPONSIVENESS

Buttons such as:

```text
Spin
Draw
Eraser
Clear
Ask AI
Next Round
Play Again
Home
Back
```

must remain easy to tap.

On small screens important buttons may use:

```css
width: 100%;
```

where appropriate.

---

# SMALL PHONE REQUIREMENTS

At <= 480px:

- reduce outer padding
- reduce oversized card padding
- use `clamp()` for oversized headings
- stack controls when needed
- keep canvas fully visible
- keep wheel fully visible
- keep leaderboard readable
- keep Home/Back accessible

Example:

```css
font-size: clamp(1.8rem, 8vw, 3rem);
```

Use only where appropriate.

---

# ACCESSIBILITY

Use:

- semantic `<button>`
- `type="button"`
- `aria-label` for icon-only buttons
- visible keyboard focus styles
- sensible touch target sizes

Avoid clickable `<div>` elements when buttons are appropriate.

---

# CSS QUALITY RULES

Before adding styles:

- inspect existing selectors
- reuse current design tokens
- avoid duplicate/conflicting media queries
- avoid unnecessary `!important`
- avoid random z-index escalation

Pay attention to:

```css
box-sizing: border-box;
min-width: 0;
max-width: 100%;
overflow-wrap: anywhere;
```

Do not hide important content merely to solve overflow.

---

# FILES LIKELY TO CHANGE

Prefer a focused patch.

Likely files:

```text
src/App.jsx
src/styles.css
drawing canvas component
wheel component
leaderboard component/markup
src/utils/supabaseLeaderboard.js
```

Do NOT modify model files unless explicitly requested.

A new Supabase SQL file is NOT required for the existing 24-hour cron because the cron is already configured and active.

If documentation is added, clearly state that the cron already exists and must NOT be duplicated.

---

# VERIFICATION

After changes run:

```bash
npm install
npm run build
```

If available:

```bash
npm run lint
```

Fix any errors introduced by the changes.

---

# VIEWPORT TESTS

Test at:

```text
1440x900
1024x768
768x1024
390x844
360x800
```

Verify no horizontal scrollbar.

---

# FULL GAME TEST CHECKLIST

1. Home loads.
2. Player Setup works.
3. Back works from Player Setup.
4. Home works from game screens.
5. Wheel works.
6. Wheel is responsive.
7. Drawing works with mouse.
8. Drawing works with touch/pointer.
9. Brush size works.
10. Eraser becomes noticeably larger.
11. Switching back to Draw restores previous brush size.
12. Clear works.
13. Timer works.
14. AI prediction works.
15. Next Round works.
16. Three rounds complete.
17. Final score is correct.
18. Final score is submitted only once.
19. Live Supabase leaderboard loads.
20. Top Winners appears above the normal leaderboard.
21. Ranking uses score DESC + total_time ASC.
22. Rank 1/2/3 are visually highlighted.
23. Mobile leaderboard does not overflow.
24. Frontend only shows last-24-hours records.
25. Existing Supabase cron is left unchanged.
26. Home/Back does not cause duplicate inserts.
27. Desktop UI remains essentially unchanged.
28. `npm run build` succeeds.

---

# DEFINITION OF DONE

The task is complete only when:

- Desktop UI remains premium.
- Tablet layout is clean.
- Mobile works at 360px.
- No horizontal overflow.
- Wheel is responsive.
- Canvas is responsive.
- Prediction panel is responsive.
- Leaderboard is responsive.
- Home button works.
- Back button works.
- Eraser is noticeably larger.
- Returning to Draw restores previous brush size.
- Top ranked winners appear above the leaderboard.
- Ranking prioritizes highest score then lowest time.
- Frontend leaderboard excludes records older than 24 hours.
- Existing Supabase cleanup cron remains unchanged and active.
- AI behavior remains intact.
- Supabase live leaderboard remains intact.
- No duplicate final-score submission occurs.
- `npm run build` succeeds.

When finished, provide a concise summary containing:

- files changed
- responsive changes
- Home/Back behavior
- leaderboard ranking changes
- Top Winners behavior
- frontend 24-hour filtering
- confirmation that existing Supabase cron was NOT duplicated
- eraser behavior
- build/test commands executed
- any remaining limitation


---

# REMOVE UPPER-LEFT DECORATIVE CIRCLE ON WHEEL SCREEN

On the Challenge / Spin Wheel screen, there is a small empty dark-blue circular decorative element positioned at the upper-left side of the wheel, inside the large wheel card.

It appears to the LEFT of the Scorpion section and is NOT part of the actual wheel.

Remove this decorative circle completely.

Requirements:

- Remove ONLY that isolated empty dark-blue circle.
- Do NOT remove or change the Scorpion segment.
- Do NOT change the challenge wheel itself.
- Do NOT change wheel size.
- Do NOT change wheel position.
- Do NOT change wheel rotation/spin animation.
- Do NOT change wheel pointer.
- Do NOT change challenge labels/icons.
- Do NOT change spin logic.
- Do NOT change the large wheel card background.
- Do NOT change responsiveness.
- Do NOT move the wheel simply to hide the circle.
- After removal, keep the wheel visually centered on desktop, tablet, and mobile.

Inspect likely locations such as:

```text
src/components/SpinWheel.jsx
src/styles.css
```

Look for an extra decorative element or pseudo-element with names/patterns similar to:

```text
wheel-decoration
decorative-circle
wheel-orbit
orbit-dot
orb
bubble
glow-circle
::before
::after
```

If the circle is created by JSX, remove only the specific decorative element.

If the circle is created by CSS `::before` or `::after`, remove/disable only the pseudo-element responsible for the empty upper-left circle.

Be careful: do NOT remove a pseudo-element that is used for:

- the wheel pointer
- wheel glow
- wheel border
- wheel shadow
- wheel center
- spin animation

Verify after removal that:

1. The unwanted dark-blue empty circle is gone.
2. The wheel remains centered.
3. The Scorpion segment remains visible and unchanged.
4. The wheel still spins correctly.
5. Desktop layout is unchanged apart from removing the circle.
6. Tablet/mobile responsiveness still works.
