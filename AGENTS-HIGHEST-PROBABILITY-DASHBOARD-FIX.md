# AGENTS.md — HIGHEST-PROBABILITY OUTPUT → FINAL DASHBOARD FIX

## Goal

Fix the AI Draw & Guess game so that for EVERY round, the class with the HIGHEST model probability is the single official prediction.

That exact top prediction must be:

1. shown in the AI Result panel
2. saved into the round result
3. used to determine correct / incorrect
4. shown in the final dashboard
5. used to calculate the final score
6. used before submitting the final score to Supabase

Do NOT use any other class selection logic.

---

# Core Rule

Given model outputs like:

```text
Scorpion  100%
Other       0%
Car         0%
Cat         0%
Lion        0%
Fish        0%
House       0%
Star        0%
```

the official prediction MUST be:

```text
Scorpion
```

The final dashboard must show:

```text
AI guessed Scorpion · 100%
```

If target is Scorpion:

```text
correct = true
score +1
green check
```

---

# Apply This To EVERY CLASS

The same logic must work for:

```text
Car
Cat
Fish
House
Star
Lion
Scorpion
Other
```

Examples:

```text
Target: Car
Highest probability: Car 94%
=> Prediction = Car
=> Correct = true
```

```text
Target: Cat
Highest probability: Cat 99%
=> Prediction = Cat
=> Correct = true
```

```text
Target: Fish
Highest probability: Fish 88%
=> Prediction = Fish
=> Correct = true
```

```text
Target: House
Highest probability: House 100%
=> Prediction = House
=> Correct = true
```

```text
Target: Star
Highest probability: Star 96%
=> Prediction = Star
=> Correct = true
```

```text
Target: Lion
Highest probability: Lion 91%
=> Prediction = Lion
=> Correct = true
```

```text
Target: Scorpion
Highest probability: Scorpion 100%
=> Prediction = Scorpion
=> Correct = true
```

If highest prediction is different:

```text
Target: Lion
Highest probability: Fish 44%
=> Prediction = Fish
=> Correct = false
```

If highest prediction is Other:

```text
Target: House
Highest probability: Other 72%
=> Prediction = Other
=> Correct = false
```

---

# 1. Use One Function To Pick The Top Prediction

Do not manually select labels.

Create one helper:

```ts
export function getTopPrediction(
  labels: string[],
  probabilities: number[]
) {
  if (!labels.length || labels.length !== probabilities.length) {
    throw new Error("Invalid model output")
  }

  let topIndex = 0

  for (let i = 1; i < probabilities.length; i++) {
    if (probabilities[i] > probabilities[topIndex]) {
      topIndex = i
    }
  }

  return {
    index: topIndex,
    label: labels[topIndex],
    probability: probabilities[topIndex],
  }
}
```

This function must be the source of truth.

---

# 2. Normalize Labels Only For Comparison

The model may return:

```text
scorpion
Scorpion
SCORPION
```

They must all compare as the same class.

Use:

```ts
export function normalizeClassName(
  value: string | null | undefined
) {
  return (value ?? "").trim().toLowerCase()
}
```

Correctness:

```ts
const correct =
  normalizeClassName(topPrediction.label) ===
  normalizeClassName(currentTarget)
```

Do NOT change which class won.

Normalization is only for comparison/display cleanup.

---

# 3. Canonical Display Names

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

Then:

```ts
const displayPrediction =
  CANONICAL_LABELS[
    normalizeClassName(topPrediction.label)
  ] ?? topPrediction.label
```

---

# 4. AI RESULT PANEL

The AI Result panel must use the SAME topPrediction.

Example:

```text
AI RESULT

AI guessed Scorpion

Scorpion    100%
Other         0%
Car           0%
...
```

Probability rows may be sorted descending for display.

But sorting the display MUST NOT change the original model label/index mapping.

Safe approach:

```ts
const ranked = labels.map((label, index) => ({
  label,
  probability: probabilities[index],
})).sort((a, b) => b.probability - a.probability)
```

The top displayed row should equal the official prediction.

---

# 5. ROUND RESULT MUST SAVE TOP CLASS

When prediction finishes:

```ts
const topPrediction =
  getTopPrediction(labels, probabilities)

const predicted =
  CANONICAL_LABELS[
    normalizeClassName(topPrediction.label)
  ] ?? topPrediction.label

const correct =
  normalizeClassName(predicted) ===
  normalizeClassName(currentTarget)

const roundResult = {
  round: currentRound,
  target: currentTarget,
  predicted,
  confidence: topPrediction.probability,
  correct,
  drawingTime,
}
```

Save THIS object.

Do not save another label from another variable.

---

# 6. CONFIDENCE FORMAT

Keep confidence internally as either:

```text
0.0 to 1.0
```

or:

```text
0 to 100
```

but be consistent.

Recommended internal format:

```text
0.0 to 1.0
```

Display:

```ts
Math.round(result.confidence * 100)
```

If current project already stores confidence as 0–100, keep that convention consistently.

Do not multiply twice.

---

# 7. FINAL DASHBOARD

The final dashboard MUST use saved round results.

Each row:

```text
Round 1: House
AI guessed House · 100% · 17s
✓
```

```text
Round 2: Scorpion
AI guessed Scorpion · 100% · 20s
✓
```

```text
Round 3: Lion
AI guessed Fish · 44% · 19s
✕
```

The final dashboard must NEVER recompute a prediction from probability arrays.

It must use:

```ts
result.predicted
result.confidence
result.correct
```

---

# 8. FINAL SCORE

Final score must be derived from round results:

```ts
const finalScore =
  results.filter((result) => result.correct).length
```

Examples:

```text
House correct
Scorpion correct
Lion correct

=> 3 / 3
```

```text
House correct
Scorpion correct
Lion incorrect

=> 2 / 3
```

---

# 9. SUPABASE SCORE

Before submitting to leaderboard:

```ts
const finalScore =
  results.filter((result) => result.correct).length
```

Submit:

```ts
{
  name: playerName,
  score: finalScore,
  total_time: totalTime,
}
```

Do not submit stale score state.

---

# 10. IMPORTANT — DO NOT USE TARGET PROBABILITY

Wrong:

```ts
const prediction = probabilityOfCurrentTarget
```

Wrong:

```ts
if target probability > threshold => correct
```

Correct:

```ts
const prediction =
  classWithHighestProbability
```

Then compare that class to target.

---

# 11. IMPORTANT — DO NOT FORCE TARGET

Never do:

```ts
if target === "Scorpion" {
  predicted = "Scorpion"
}
```

Never manipulate output to make the game succeed.

The actual model top class must win.

---

# 12. IMPORTANT — DO NOT FORCE OTHER

Do not use:

```ts
if confidence < 0.8 {
  predicted = "Other"
}
```

Do not use top1/top2 margin rejection unless explicitly requested.

Highest probability wins.

---

# 13. TIMER AND ASK-AI MUST USE SAME LOGIC

Manual Ask AI and automatic TIME'S UP prediction must both call the same function:

```ts
finalizePrediction(probabilities)
```

Inside:

```ts
const top = getTopPrediction(labels, probabilities)
```

No duplicate logic.

---

# 14. PREVENT DUPLICATE ROUND SAVE

Use a finalization guard:

```ts
if (predictionFinalizedRef.current) return
predictionFinalizedRef.current = true
```

Reset it at the beginning of each new round.

---

# 15. REQUIRED LIVE TESTS

Test all playable classes.

## Car
If:

```text
Car 91%
Other 4%
...
```

then:

```text
predicted = Car
```

## Cat
If:

```text
Cat 99%
...
```

then:

```text
predicted = Cat
```

## Fish
If:

```text
Fish 93%
...
```

then:

```text
predicted = Fish
```

## House
If:

```text
House 100%
...
```

then:

```text
predicted = House
```

## Star
If:

```text
Star 95%
...
```

then:

```text
predicted = Star
```

## Lion
If:

```text
Lion 97%
...
```

then:

```text
predicted = Lion
```

## Scorpion
If:

```text
scorpion 100%
...
```

then:

```text
predicted = Scorpion
```

The final dashboard must show Scorpion as correct if target is Scorpion.

---

# 16. EXACT USER BUG TO REPRODUCE

Current bug:

```text
Target = Scorpion
AI result panel:
scorpion = 100%
```

but final dashboard displays:

```text
Round 2: Scorpion
AI guessed Scorpion · 100%
✕
```

This is WRONG.

After fix:

```text
Round 2: Scorpion
AI guessed Scorpion · 100%
✓
```

and the score must include that point.

---

# 17. DO NOT CHANGE UI

Do not alter:

- approved dark neon UI
- wheel
- challenge screen
- Start Drawing screen
- timer
- TIME'S UP overlay
- canvas
- responsive layout
- final dashboard design
- leaderboard design
- Supabase schema
- CNN model

Only fix model-output → round-result → final-dashboard consistency.

---

# 18. DEVELOPMENT LOGGING

Temporarily log:

```ts
console.log({
  labels,
  probabilities,
  topPrediction,
  target: currentTarget,
  predictedNormalized:
    normalizeClassName(topPrediction.label),
  targetNormalized:
    normalizeClassName(currentTarget),
  correct,
})
```

For Scorpion it should show:

```text
topPrediction.label = "scorpion"
topPrediction.probability = 1
target = "Scorpion"
correct = true
```

---

# 19. BUILD

Run:

```bash
npm install
npm run build
```

Then test actual browser gameplay.

Do not claim success only from build.

---

# ACCEPTANCE CRITERIA

Every round follows:

```text
CNN outputs
↓
find highest percentage
↓
that class becomes official prediction
↓
save that class + percentage
↓
compare top class with target (case-insensitive)
↓
store correct true/false
↓
final dashboard reads saved round result
↓
final score derived from correct results
↓
Supabase receives same score
```

For:

```text
Target: Scorpion
Highest CNN output: scorpion 100%
```

required result:

```text
Prediction: Scorpion
Confidence: 100%
Correct: true
Green ✓
Score +1
```
