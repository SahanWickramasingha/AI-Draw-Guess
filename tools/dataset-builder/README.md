# Clean Quick Draw Dataset Builder — Final Version

This tool builds a cleaner dataset for the **AI Draw & Guess** Open Day game.

## Classes

- Car
- Cat
- Fish
- House
- Star
- Lion
- Monkey
- Scorpion
- Other

## Why this version is better

The Hugging Face Quick Draw loader shows that the **raw** Quick Draw data contains a `recognized` boolean, while the bitmap representation only exposes image + label. This builder therefore streams the raw NDJSON data and keeps `recognized == true` target examples.

It also:

- rejects tiny / near-empty / extreme samples
- crops and centers drawings
- renders them as 224×224 white-background PNGs
- creates separate `train` and `test` folders
- creates an `Other` class from non-target shapes/scribbles
- creates some incomplete target sketches as hard negatives for `Other`
- produces a CSV report of the selected samples

## Setup

Open a terminal in this folder and run:

```bash
python -m pip install -r requirements.txt
python build_clean_quickdraw_dataset.py
```

Internet access is required while the script runs because it streams Quick Draw raw NDJSON from Google Cloud Storage.

## Output

```text
Clean-QuickDraw-Dataset/
├── Car/
│   ├── train/
│   └── test/
├── Cat/
├── Fish/
├── House/
├── Star/
├── Lion/
├── Monkey/
├── Scorpion/
├── Other/
├── dataset_report.csv
├── dataset_metadata.json
└── README-FIRST.txt
```

## Teachable Machine

Upload **only** the `train` folder contents for each class.

Recommended starting settings:

```text
Epochs: 60
Batch Size: 16
Learning Rate: 0.0005
```

Keep the `test` images completely unseen until training finishes.

## Recommended app acceptance rule

A prediction should be accepted only when:

```text
Top confidence >= 80%
AND
Top1 - Top2 >= 20%
AND
Top class != Other
```

For best accuracy, the game should also crop, center and resize the browser-canvas drawing before prediction.
