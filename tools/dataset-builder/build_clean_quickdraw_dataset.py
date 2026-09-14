from __future__ import annotations

import csv
import io
import json
import math
import random
import shutil
import sys
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw


# ============================================================
# CLEAN QUICK DRAW DATASET BUILDER
# ============================================================
#
# Target model classes:
#   Car, Cat, Fish, House, Star, Lion, Monkey, Scorpion
#
# Also creates:
#   Other
#
# Data source:
#   Google Quick, Draw! raw moderated NDJSON.
#
# Key idea:
#   1) recognized == True only for valid target training examples
#   2) extra geometric/scribble categories become "Other"
#   3) some partial target sketches become hard-negative "Other"
#   4) every sketch is cropped, centered, padded and rendered to 224x224
#
# This is designed for Teachable Machine / browser-drawing classifiers.
# ============================================================


TARGET_CLASSES = [
    "car",
    "cat",
    "fish",
    "house",
    "star",
    "lion",
    "monkey",
    "scorpion",
]

# These are intentionally NOT target classes. They make a useful rejection class.
OTHER_SOURCE_CLASSES = [
    "circle",
    "square",
    "triangle",
    "line",
    "squiggle",
    "zigzag",
    "cloud",
    "smiley face",
]

# Output size per real class.
TRAIN_PER_CLASS = 140
TEST_PER_CLASS = 30

# Output size for Other.
OTHER_TRAIN = 180
OTHER_TEST = 40

# How many raw lines to inspect per category for diversity.
# Increase to 6000-10000 if you want a wider candidate pool.
MAX_SCAN_PER_CLASS = 4500

# Rendering / quality filtering.
IMAGE_SIZE = 224
PADDING = 24
LINE_WIDTH = 10
RANDOM_SEED = 2026

# The raw URL pattern comes from the official Quick Draw loader.
RAW_URL = "https://storage.googleapis.com/quickdraw_dataset/full/raw/{}.ndjson"


@dataclass
class Candidate:
    category: str
    key_id: str
    drawing: list
    recognized: bool
    countrycode: str = ""


def safe_category_for_url(name: str) -> str:
    return urllib.parse.quote(name, safe="")


def category_url(name: str) -> str:
    return RAW_URL.format(safe_category_for_url(name))


def iter_raw_examples(category: str, max_scan: int) -> Iterable[dict]:
    """
    Stream NDJSON from Google Cloud Storage instead of downloading a huge
    file to disk. Stops after max_scan lines.
    """
    url = category_url(category)
    print(f"\nDownloading/streaming: {category}")
    print(f"  {url}")

    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 CleanQuickDrawDatasetBuilder/1.0"
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            for index, raw_line in enumerate(response):
                if index >= max_scan:
                    break

                try:
                    line = raw_line.decode("utf-8").strip()
                    if not line:
                        continue
                    yield json.loads(line)
                except (UnicodeDecodeError, json.JSONDecodeError):
                    continue

    except urllib.error.HTTPError as exc:
        raise RuntimeError(
            f"Could not download '{category}'. HTTP {exc.code}: {exc.reason}"
        ) from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(
            f"Could not reach Quick Draw storage for '{category}': {exc.reason}"
        ) from exc


def drawing_stats(drawing: list) -> dict | None:
    if not drawing or not isinstance(drawing, list):
        return None

    xs: list[float] = []
    ys: list[float] = []
    total_points = 0
    path_length = 0.0
    nonempty_strokes = 0

    for stroke in drawing:
        if not isinstance(stroke, list) or len(stroke) < 2:
            continue

        x_vals = stroke[0]
        y_vals = stroke[1]

        if not isinstance(x_vals, list) or not isinstance(y_vals, list):
            continue

        n = min(len(x_vals), len(y_vals))
        if n < 2:
            continue

        nonempty_strokes += 1
        total_points += n

        sx = [float(v) for v in x_vals[:n]]
        sy = [float(v) for v in y_vals[:n]]

        xs.extend(sx)
        ys.extend(sy)

        for i in range(1, n):
            dx = sx[i] - sx[i - 1]
            dy = sy[i] - sy[i - 1]
            path_length += math.hypot(dx, dy)

    if not xs or not ys:
        return None

    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)

    width = max_x - min_x
    height = max_y - min_y

    return {
        "strokes": nonempty_strokes,
        "points": total_points,
        "path_length": path_length,
        "min_x": min_x,
        "max_x": max_x,
        "min_y": min_y,
        "max_y": max_y,
        "width": width,
        "height": height,
    }


def is_quality_target(drawing: list) -> bool:
    """
    Broad quality filter.
    It does NOT try to decide whether a drawing is artistically good.
    It removes obviously tiny, empty, broken, or extreme examples.
    """
    s = drawing_stats(drawing)
    if s is None:
        return False

    if s["strokes"] < 1 or s["strokes"] > 25:
        return False

    if s["points"] < 18 or s["points"] > 1500:
        return False

    if s["path_length"] < 55:
        return False

    if s["width"] < 22 or s["height"] < 22:
        return False

    aspect = s["width"] / max(s["height"], 1e-6)
    if aspect < 0.12 or aspect > 8.0:
        return False

    # Quick Draw raw coordinate space is roughly 0..255.
    bbox_area = s["width"] * s["height"]
    if bbox_area < 900:
        return False

    return True


def normalize_points(drawing: list, image_size: int, padding: int) -> list[list[tuple[float, float]]]:
    s = drawing_stats(drawing)
    if s is None:
        return []

    width = max(s["width"], 1.0)
    height = max(s["height"], 1.0)

    usable = image_size - 2 * padding
    scale = min(usable / width, usable / height)

    scaled_width = width * scale
    scaled_height = height * scale

    offset_x = (image_size - scaled_width) / 2.0
    offset_y = (image_size - scaled_height) / 2.0

    normalized: list[list[tuple[float, float]]] = []

    for stroke in drawing:
        if not isinstance(stroke, list) or len(stroke) < 2:
            continue

        x_vals = stroke[0]
        y_vals = stroke[1]
        n = min(len(x_vals), len(y_vals))

        points = []
        for x, y in zip(x_vals[:n], y_vals[:n]):
            nx = (float(x) - s["min_x"]) * scale + offset_x
            ny = (float(y) - s["min_y"]) * scale + offset_y
            points.append((nx, ny))

        if len(points) >= 2:
            normalized.append(points)

    return normalized


def render_drawing(
    drawing: list,
    image_size: int = IMAGE_SIZE,
    padding: int = PADDING,
    line_width: int = LINE_WIDTH,
) -> Image.Image:
    image = Image.new("L", (image_size, image_size), color=255)
    draw = ImageDraw.Draw(image)

    strokes = normalize_points(drawing, image_size, padding)

    for points in strokes:
        draw.line(
            points,
            fill=0,
            width=line_width,
            joint="curve",
        )

        # Rounded endpoints make the output closer to browser canvas strokes.
        r = line_width / 2
        for px, py in (points[0], points[-1]):
            draw.ellipse(
                (px - r, py - r, px + r, py + r),
                fill=0,
            )

    return image.convert("RGB")


def make_partial_drawing(drawing: list, rng: random.Random) -> list:
    """
    Convert a target-class sketch into an incomplete hard negative.
    This is useful for the Other class.
    """
    valid_strokes = [stroke for stroke in drawing if isinstance(stroke, list) and len(stroke) >= 2]
    if not valid_strokes:
        return []

    # Sometimes keep only the first subset of strokes.
    if len(valid_strokes) >= 2 and rng.random() < 0.65:
        keep = max(1, int(len(valid_strokes) * rng.uniform(0.25, 0.55)))
        return valid_strokes[:keep]

    # Otherwise truncate each stroke.
    partial = []
    for stroke in valid_strokes:
        x_vals = list(stroke[0])
        y_vals = list(stroke[1])
        if len(x_vals) < 4:
            continue

        keep = max(2, int(min(len(x_vals), len(y_vals)) * rng.uniform(0.25, 0.55)))
        new_stroke = [x_vals[:keep], y_vals[:keep]]

        if len(stroke) >= 3 and isinstance(stroke[2], list):
            new_stroke.append(list(stroke[2])[:keep])

        partial.append(new_stroke)

    return partial


def reservoir_add(reservoir: list, item, seen: int, capacity: int, rng: random.Random):
    if len(reservoir) < capacity:
        reservoir.append(item)
        return

    replacement = rng.randint(0, seen)
    if replacement < capacity:
        reservoir[replacement] = item


def collect_target_candidates(
    category: str,
    needed: int,
    rng: random.Random,
) -> list[Candidate]:
    reservoir: list[Candidate] = []
    valid_seen = 0

    for example in iter_raw_examples(category, MAX_SCAN_PER_CLASS):
        if example.get("word", "").strip().lower() != category.lower():
            continue

        if example.get("recognized") is not True:
            continue

        drawing = example.get("drawing")
        if not is_quality_target(drawing):
            continue

        candidate = Candidate(
            category=category,
            key_id=str(example.get("key_id", "")),
            drawing=drawing,
            recognized=True,
            countrycode=str(example.get("countrycode", "")),
        )

        reservoir_add(reservoir, candidate, valid_seen, needed, rng)
        valid_seen += 1

    if len(reservoir) < needed:
        raise RuntimeError(
            f"Only found {len(reservoir)} usable '{category}' samples; "
            f"need {needed}. Increase MAX_SCAN_PER_CLASS."
        )

    rng.shuffle(reservoir)
    return reservoir[:needed]


def collect_other_candidates(
    needed: int,
    rng: random.Random,
) -> list[Candidate]:
    """
    Other = mostly recognized non-target primitive/scribble categories.
    """
    combined: list[Candidate] = []
    per_category_target = max(12, math.ceil(needed / len(OTHER_SOURCE_CLASSES)) + 5)

    for category in OTHER_SOURCE_CLASSES:
        category_samples = collect_target_candidates(
            category=category,
            needed=per_category_target,
            rng=rng,
        )

        for item in category_samples:
            combined.append(
                Candidate(
                    category="other",
                    key_id=item.key_id,
                    drawing=item.drawing,
                    recognized=True,
                    countrycode=item.countrycode,
                )
            )

    rng.shuffle(combined)
    return combined[:needed]


def split_candidates(items: list[Candidate], train_count: int, test_count: int):
    required = train_count + test_count
    if len(items) < required:
        raise ValueError(f"Need {required} samples, got {len(items)}")

    train = items[:train_count]
    test = items[train_count:required]
    return train, test


def write_images(
    output_root: Path,
    class_name: str,
    split_name: str,
    candidates: list[Candidate],
    report_rows: list[dict],
):
    folder = output_root / class_name / split_name
    folder.mkdir(parents=True, exist_ok=True)

    for index, candidate in enumerate(candidates, start=1):
        filename = f"{class_name.lower()}_{split_name}_{index:03}.png"
        output_path = folder / filename

        image = render_drawing(candidate.drawing)
        image.save(output_path, optimize=True)

        stats = drawing_stats(candidate.drawing) or {}

        report_rows.append(
            {
                "class": class_name,
                "split": split_name,
                "file": str(output_path.relative_to(output_root)),
                "source_category": candidate.category,
                "key_id": candidate.key_id,
                "recognized": candidate.recognized,
                "countrycode": candidate.countrycode,
                "strokes": stats.get("strokes", ""),
                "points": stats.get("points", ""),
                "path_length": round(stats.get("path_length", 0.0), 2),
                "bbox_width": round(stats.get("width", 0.0), 2),
                "bbox_height": round(stats.get("height", 0.0), 2),
            }
        )


def main():
    rng = random.Random(RANDOM_SEED)

    output_root = Path("Clean-QuickDraw-Dataset")

    if output_root.exists():
        answer = input(
            f"'{output_root}' already exists. Delete it and rebuild? [y/N]: "
        ).strip().lower()

        if answer != "y":
            print("Cancelled.")
            return

        shutil.rmtree(output_root)

    output_root.mkdir(parents=True, exist_ok=True)

    report_rows: list[dict] = []
    selected_target_samples: dict[str, list[Candidate]] = {}

    total_each = TRAIN_PER_CLASS + TEST_PER_CLASS

    print("=" * 68)
    print("CLEAN QUICK DRAW DATASET BUILDER")
    print("=" * 68)
    print(f"Target classes: {', '.join(TARGET_CLASSES)}")
    print(f"Each class: {TRAIN_PER_CLASS} train + {TEST_PER_CLASS} test")
    print(f"Other: {OTHER_TRAIN} train + {OTHER_TEST} test")
    print("=" * 68)

    # 1) Target classes
    for category in TARGET_CLASSES:
        print(f"\n[ TARGET ] {category.upper()}")
        samples = collect_target_candidates(
            category=category,
            needed=total_each,
            rng=rng,
        )

        selected_target_samples[category] = samples

        train, test = split_candidates(
            samples,
            TRAIN_PER_CLASS,
            TEST_PER_CLASS,
        )

        class_name = category.capitalize()

        write_images(
            output_root,
            class_name,
            "train",
            train,
            report_rows,
        )
        write_images(
            output_root,
            class_name,
            "test",
            test,
            report_rows,
        )

        print(f"  ✓ {len(train)} train")
        print(f"  ✓ {len(test)} test")

    # 2) Other class from recognized non-target primitives/scribbles
    print("\n[ OTHER ] collecting non-target doodles...")
    other_total = OTHER_TRAIN + OTHER_TEST

    # Keep 75% as recognized non-target doodles.
    regular_other_count = int(other_total * 0.75)
    other_candidates = collect_other_candidates(
        needed=regular_other_count,
        rng=rng,
    )

    # 25% partial target sketches = hard negatives.
    partial_needed = other_total - len(other_candidates)
    partial_candidates: list[Candidate] = []

    target_pool = [
        candidate
        for category_samples in selected_target_samples.values()
        for candidate in category_samples
    ]
    rng.shuffle(target_pool)

    for candidate in target_pool:
        if len(partial_candidates) >= partial_needed:
            break

        partial = make_partial_drawing(candidate.drawing, rng)
        if not partial:
            continue

        stats = drawing_stats(partial)
        if stats is None:
            continue

        # We want visibly incomplete, but not completely blank.
        if stats["points"] < 6 or stats["path_length"] < 18:
            continue

        partial_candidates.append(
            Candidate(
                category=f"partial_{candidate.category}",
                key_id=f"partial_{candidate.key_id}",
                drawing=partial,
                recognized=False,
                countrycode=candidate.countrycode,
            )
        )

    other_candidates.extend(partial_candidates)
    rng.shuffle(other_candidates)

    if len(other_candidates) < other_total:
        raise RuntimeError(
            f"Could not build enough Other examples: "
            f"{len(other_candidates)}/{other_total}"
        )

    other_train, other_test = split_candidates(
        other_candidates,
        OTHER_TRAIN,
        OTHER_TEST,
    )

    write_images(
        output_root,
        "Other",
        "train",
        other_train,
        report_rows,
    )
    write_images(
        output_root,
        "Other",
        "test",
        other_test,
        report_rows,
    )

    print(f"  ✓ {len(other_train)} Other train")
    print(f"  ✓ {len(other_test)} Other test")

    # 3) Dataset report
    report_path = output_root / "dataset_report.csv"
    fieldnames = [
        "class",
        "split",
        "file",
        "source_category",
        "key_id",
        "recognized",
        "countrycode",
        "strokes",
        "points",
        "path_length",
        "bbox_width",
        "bbox_height",
    ]

    with report_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(report_rows)

    # 4) Metadata / usage instructions
    metadata = {
        "target_classes": [name.capitalize() for name in TARGET_CLASSES],
        "other_class": "Other",
        "train_per_target_class": TRAIN_PER_CLASS,
        "test_per_target_class": TEST_PER_CLASS,
        "other_train": OTHER_TRAIN,
        "other_test": OTHER_TEST,
        "image_size": IMAGE_SIZE,
        "padding": PADDING,
        "line_width": LINE_WIDTH,
        "random_seed": RANDOM_SEED,
        "quality_filter": {
            "recognized_target_examples_only": True,
            "min_points": 18,
            "min_path_length": 55,
            "min_bbox_dimension": 22,
        },
    }

    (output_root / "dataset_metadata.json").write_text(
        json.dumps(metadata, indent=2),
        encoding="utf-8",
    )

    instructions = f"""CLEAN QUICK DRAW DATASET COMPLETE

TEACHABLE MACHINE CLASSES
=========================
Car
Cat
Fish
House
Star
Lion
Monkey
Scorpion
Other

TRAINING
========
Upload ONLY each class's train folder to Teachable Machine.

Do NOT upload the test folders during training.

Recommended first training:
Epochs: 60
Batch Size: 16
Learning Rate: 0.0005

After training, test using the separate test folders.

APP DECISION RULE
=================
Recommended:
- reject if top confidence < 0.80
- reject if (top1 - top2) < 0.20
- reject if Other is the highest class

The web app should also crop/center/resize the player's drawing before
sending it to the model, so runtime drawings look similar to these
centered training images.
"""

    (output_root / "README-FIRST.txt").write_text(
        instructions,
        encoding="utf-8",
    )

    print("\n" + "=" * 68)
    print("✓ DATASET BUILD COMPLETE")
    print("=" * 68)
    print(f"Output folder: {output_root.resolve()}")
    print("Use only the /train folders for Teachable Machine training.")
    print("Keep /test folders unseen for evaluation.")
    print("=" * 68)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nCancelled by user.")
        sys.exit(1)
    except Exception as exc:
        print(f"\nERROR: {exc}")
        sys.exit(1)
