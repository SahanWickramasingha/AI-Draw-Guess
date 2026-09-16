# AGENTS.md — FINAL SCORING / RESULT CONSISTENCY FIX

## Scope
Fix ONLY round correctness, final score, final dashboard result icons, and leaderboard score submission consistency.

Do NOT redesign the UI.
Do NOT modify the CNN model.
Do NOT change the wheel, timer, canvas, Supabase schema, or visual style unless required for this scoring fix.

The screenshots prove a bug:
- Round target: `Scorpion`
- AI prediction: `scorpion`
- AI probability: `100%`
- Final dashboard incorrectly shows a red X
- Final total incorrectly becomes `2/3`

This must be fixed.

## Root cause to inspect first
Likely case-sensitive comparison such as:

```ts
predictedClass === targetClass
```

where:
```text
targetClass = "Scorpion"
predictedClass = "scorpion"
```

There may also be stale React score state / async update issues.

Inspect the existing code before changing anything.

## One shared normalization function
Create one shared normalizer and use it EVERYWHERE correctness is checked:

```ts
export function normalizeClassName(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase()
}
```

Correctness MUST be:

```ts
const isCorrect =
  normalizeClassName(predictedClass) ===
  normalizeClassName(targetClass)
```

Do not use raw string equality elsewhere.

## Canonical display labels
Use:

```ts
const CANONICAL_LABELS: Record<string, string> = {
  car: "Car",
  cat: "Cat",
  fish: "Fish",
  house: "House",
  star: "Star",
  lion: "Lion",
  scorpion: "Scorpion",
  other: "Other",
  others: "Other",
}
```

When displaying:

```ts
const normalized = normalizeClassName(rawPrediction)
const displayPrediction =
  CANONICAL_LABELS[normalized] ?? rawPrediction
```

This ensures `scorpion`, `Scorpion`, and `SCORPION` are treated as the same class.

## Other / Others normalization
If the model/result UI contains `others`, normalize it to canonical `Other`.

Playable classes remain:
- Car
- Cat
- Fish
- House
- Star
- Lion
- Scorpion

Never treat Other as correct for a playable target.

## Round result must store correctness once
When AI inference completes, create the final round result from normalized values:

```ts
const predicted =
  CANONICAL_LABELS[normalizeClassName(rawPredictedClass)] ??
  rawPredictedClass

const target =
  CANONICAL_LABELS[normalizeClassName(currentTarget)] ??
  currentTarget

const correct =
  normalizeClassName(predicted) ===
  normalizeClassName(target)

const roundResult = {
  round: currentRound,
  target,
  predicted,
  confidence: topProbability,
  correct,
  drawingTime,
}
```

Append THIS object to results.

Do not recompute correctness later using another rule.

## Final dashboard must use result.correct
Use:

```tsx
{result.correct ? <CheckIcon /> : <XIcon />}
```

Do not compare raw labels again inside the dashboard.

## Final score must be derived from results
Authoritative score:

```ts
const finalScore =
  results.filter((result) => result.correct).length
```

For:
- House → House
- Scorpion → scorpion
- Lion → Lion

the final score MUST be `3 / 3`.

## Avoid stale score state
Avoid:

```ts
setScore(score + 1)
```

Prefer:

```ts
const completedResults = [...results, newRoundResult]
const derivedScore = completedResults.filter((r) => r.correct).length

setResults(completedResults)
setScore(derivedScore)
```

The final dashboard and Supabase submission must use the score derived from completedResults.

## Supabase leaderboard must use derived score
Do NOT submit stale score state.

Use:

```ts
const finalScore =
  completedResults.filter((r) => r.correct).length

await saveScore({
  name: playerName,
  score: finalScore,
  total_time: totalTime,
})
```

This ensures the leaderboard cannot say 2/3 when all three rounds are correct.

## Prevent duplicate finalization
Prediction may finish from:
- Ask AI
- timer reaching zero
- auto-check after TIME'S UP

Only one path may finalize a round.

Use a guard such as:

```ts
if (predictionFinalizedRef.current) return
predictionFinalizedRef.current = true
```

Reset at the start of every new round.

## Timer and Ask AI must share one finalizer
Both manual Ask AI and timer auto-prediction must call ONE shared function, e.g.:

```ts
finalizePrediction(prediction)
```

That function must:
1. normalize predicted label
2. normalize target label
3. compute correct
4. create RoundResult
5. append once
6. derive score
7. lock the round

## Class order
Expected logical classes:
- Car
- Cat
- Fish
- House
- Star
- Lion
- Scorpion
- Other

Do not alphabetically sort labels before mapping outputs.

## Final dashboard row
A correct Scorpion round must show:

```text
Round 2: Scorpion
AI guessed Scorpion · 100% · 20s
✓
```

It must NEVER show a red X for the same target/prediction pair.

## Score consistency
The same derived finalScore must be used in:
- main final score card
- final dashboard
- Supabase payload
- top winner cards
- leaderboard rows

There must not be multiple conflicting score sources.

## Leaderboard ordering
Keep:
```text
score DESC
total_time ASC
created_at ASC
```

Do not change ranking rules.

## Required tests
Verify:

```text
Target Scorpion / Prediction scorpion => true
Target Scorpion / Prediction Scorpion => true
Target SCORPION / Prediction scorpion => true
Target Lion / Prediction lion => true
Target House / Prediction House => true
Target Cat / Prediction cat => true
Target Star / Prediction star => true
Target Car / Prediction fish => false
Target Fish / Prediction Other => false
```

Also verify a 3-correct-round game:
```text
✓
✓
✓
3/3
```

and Supabase saves:
```text
score = 3
```

## Development logging
Temporarily log:

```ts
console.log({
  targetRaw,
  predictedRaw,
  targetNormalized: normalizeClassName(targetRaw),
  predictedNormalized: normalizeClassName(predictedRaw),
  correct,
})
```

For the Scorpion bug, expected:

```text
targetRaw: "Scorpion"
predictedRaw: "scorpion"
targetNormalized: "scorpion"
predictedNormalized: "scorpion"
correct: true
```

## Do not change
Do not alter:
- approved UI
- challenge wheel
- 20-second timer
- canvas lock after time up
- intermediate “Your Challenge” page
- CNN model
- CNN probabilities
- drawing tools
- responsive styling
- leaderboard design
- 24-hour leaderboard behavior
- Home/Back

Only fix scoring/result consistency.

## Build and verification
Run:

```bash
npm install
npm run build
```

Then manually reproduce the Scorpion case in the browser.

Do NOT claim success only because the build passes.

## Acceptance criteria
For:
```text
Target = Scorpion
CNN top prediction = scorpion
Confidence = 100%
```

the app MUST produce:
```text
correct = true
green check
score +1
final dashboard counts the point
Supabase leaderboard receives the corrected final score
```

If House, Scorpion, and Lion are all recognized correctly, the final result MUST be:

```text
3 / 3
```

with three green check icons.

## Codex final report
Report:
1. root cause
2. files changed
3. normalization function
4. whether label case mismatch existed
5. whether Other/others normalization was needed
6. how final score is derived
7. how Supabase score is derived
8. duplicate-finalization guard
9. Scorpion reproduction result
10. npm run build result
