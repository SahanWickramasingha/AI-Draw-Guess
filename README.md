# AI Draw & Guess — Modern Open Day Game

A responsive React + Vite interactive AI drawing recognition game designed for an Open Day activity.

## Included

- Modern dark / glass UI
- Player name entry
- Animated random spin wheel
- 5 classes: Car, Cat, Fish, House, Star
- 3-round gameplay
- Mouse + touch drawing canvas
- Draw / erase / brush size / clear tools
- Teachable Machine + TensorFlow.js prediction
- Confidence bars
- Correct / incorrect / unsure states
- Score tracking
- Final round summary
- Local leaderboard saved in browser LocalStorage
- Responsive desktop / tablet / mobile layout

## IMPORTANT — Add your trained Teachable Machine model

Copy these 3 files into:

`public/model/`

Files:
- `model.json`
- `metadata.json`
- `weights.bin`

The project currently contains a text file in that folder showing the required location.

## Run

Open the project folder in VS Code and run:

```bash
npm install
npm run dev
```

Then open the local Vite URL shown in the terminal.

## Teachable Machine class names

Your exported model should use these exact class names:

- Car
- Cat
- Fish
- House
- Star

## Game rule

- 3 rounds
- Spin wheel picks a unique object each round
- Player draws the object
- AI predicts the class
- A correct prediction at 60% confidence or higher gives 1 point
- Final score is out of 3
- Leaderboard ranks by score, then lower total drawing time

## Open Day note

For best reliability:
- Use one laptop/browser throughout the event if you want the local leaderboard to persist.
- Keep the model files local so the AI model works without relying on the internet after the project is installed.
- Test each class with several new hand-drawn examples before the event.


## Dependency note

This fixed build pins `@tensorflow/tfjs` to `1.3.1`, matching the peer dependency required by `@teachablemachine/image@0.8.5`.

## Cinematic UI redesign

This build follows the two supplied visual references:
- Home: cinematic central glowing AI start orb with orbiting challenge cards.
- Player setup: stepper + neon glass player card + sci-fi Open Day presentation.
- Challenge, wheel, drawing, result, and leaderboard screens use the same cyan/blue/purple visual language.


## Final additions

- OUSL crest included in the Open Day 2026 navigation badge.
- 20-second drawing limit on every round.
- Canvas automatically locks when time reaches zero.
- If a drawing exists at zero seconds, the AI automatically checks it.
- If no drawing exists, the round ends with 0 points.
- Animated cyan/purple orbit rings around the central AI start button.
- Colorful custom SVG icons for Cat, Fish, House, Star, and Car.


## Expanded challenge wheel

The UI now includes 8 wheel items:

- Car
- Cat
- Fish
- House
- Star
- Lion
- Monkey
- Scorpion

Important: the exported Teachable Machine model must also contain **Lion**, **Monkey**, and **Scorpion** class labels before those three challenges can be recognized/scored by the AI. After retraining, replace the 3 files in `public/model/`.

Home navigation text links (Home / How it Works / About) were removed. The Open Day 2026 badge remains.
The wheel is larger on desktop, clearly segmented, and responsive on tablets and phones.


## Integrated AI model

The trained Teachable Machine model is already included in:

`public/model/`

Included files:
- `model.json`
- `metadata.json`
- `weights.bin`

Embedded model labels:
- Cat
- Fish
- House
- Star
- Car
- lion
- monkey
- scorpion

No manual model copy step is required for this package.

### Run

```bash
npm install
npm run dev
```

If replacing the model later, replace the same three files in `public/model/`, restart Vite, and hard-refresh the browser.


# ULTIMATE FINAL BUILD — clean dataset + normalized prediction

This package now contains both:

1. The complete Open Day React game UI.
2. `tools/dataset-builder/` for building the cleaner Quick Draw training dataset.

## Runtime AI improvements included

Before prediction, the browser drawing is automatically:

- scanned for ink
- cropped to its actual drawing bounds
- centered in a square
- padded
- resized to 224×224
- rejected if it has too little drawing detail

Prediction acceptance rule:

```text
Top confidence >= 80%
AND
Top1 - Top2 >= 20%
AND
Top class != Other
```

This reduces the problem where an incomplete drawing is forced into a known class with a high percentage.

## Cleaner retraining workflow

From the project root:

```bash
cd tools/dataset-builder
python -m pip install -r requirements.txt
python build_clean_quickdraw_dataset.py
```

Then create these Teachable Machine classes:

```text
Car
Cat
Fish
House
Star
Lion
Monkey
Scorpion
Other
```

Upload **train only**. Keep test folders unseen.

Recommended training settings:

```text
Epochs: 60
Batch Size: 16
Learning Rate: 0.0005
```

Export as TensorFlow.js and replace only:

```text
public/model/model.json
public/model/metadata.json
public/model/weights.bin
```

Then restart Vite and hard refresh the browser.


## Newly integrated Teachable Machine model

The uploaded model has been embedded directly into `public/model/`.

Detected labels:

- Cat
- Fish
- House
- Star
- Car
- lion
- monkey
- scorpion
- other

No manual model copy step is required for this ZIP.


## Monkey removed

The Monkey challenge has been removed from the game wheel/target pool.
The bundled Teachable Machine model still contains a `monkey` output neuron,
but the UI treats `monkey` predictions as uncertain/rejected rather than as a
valid game answer.

Active game targets:
- Car
- Cat
- Fish
- House
- Star
- Lion
- Scorpion


# Supabase Live Leaderboard — Integrated

This build is already connected to the Open Day Supabase project using a
**publishable** browser key. No secret/service-role key is included.

Supabase project:
`https://yvssofjvagavdcmghblt.supabase.co`

Table expected:
`public.leaderboard`

Columns expected:
- id
- name
- score
- total_time
- created_at

The app now:
1. Loads the shared leaderboard when the game opens.
2. Saves `name + score + total_time` after the final round.
3. Sorts by highest score, then fastest total time.
4. Shows the same top players on phones, laptops and tablets.
5. Falls back to localStorage if Supabase/internet is temporarily unavailable.

## Run locally

```bash
npm install
npm run dev
```

## Vercel

This ZIP works with the embedded Supabase publishable configuration.
For cleaner production configuration you can additionally define:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

in Vercel Project Settings → Environment Variables.

Never place a Supabase `sb_secret_...` or service-role key in the frontend.


## Supabase new-key compatibility

This build uses the new `sb_publishable_...` API key format correctly:
the browser sends it in the `apikey` header. It is not treated as a JWT
or sent as an `Authorization: Bearer` token.
