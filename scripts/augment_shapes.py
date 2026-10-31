#!/usr/bin/env python3
"""Augmentation conservador para desenhos geométricos (círculo/quadrado/triângulo).

Requisitos: pip install pillow numpy
Exemplo: python scripts/augment_shapes_safe.py --per-image 80

Os originais são divididos por grupo (arquivo-fonte) ANTES das transformações.
Todas as variações de cada original permanecem exclusivamente no treino.
"""

from __future__ import annotations

import argparse
import csv
import random
from collections import Counter
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter, ImageOps

CLASSES = ("circle", "square", "triangle")
EXTENSIONS = {".png", ".jpg", ".jpeg", ".bmp", ".webp"}

# Script localizado em <raiz>/scripts/augment_shapes_safe.py
REPO_ROOT = Path(__file__).resolve().parent.parent
INPUT_DIR = REPO_ROOT / "docs" / "images"
OUTPUT_DIR = REPO_ROOT / "scripts" / "images"


def label_for(path: Path) -> str | None:
    name = path.stem.lower()
    for label in CLASSES:
        if name.startswith(label + "-") or name.startswith(label + "_"):
            return label
    return None


def load_as_gray(path: Path) -> Image.Image:
    with Image.open(path) as source:
        img = ImageOps.exif_transpose(source).convert("RGBA")
        background = Image.new("RGBA", img.size, (255, 255, 255, 255))
        image = Image.alpha_composite(background, img).convert("L")

    arr = np.asarray(image)
    borders = np.concatenate([arr[0, :], arr[-1, :], arr[:, 0], arr[:, -1]])
    if float(np.median(borders)) < 100:  # fundo escuro / traços claros
        image = ImageOps.invert(image)
    return image


def normalize_original(path: Path, size: int, margin: int) -> Image.Image:
    """Recorta uma única vez ao redor da figura e centraliza em fundo branco.

    Retorna máscara: traços brancos (255) em fundo preto (0).
    """
    image = load_as_gray(path)
    original = np.asarray(image, dtype=np.uint8)
    ys, xs = np.where(original < 220)
    if len(xs) < 12:
        raise ValueError("imagem de origem sem desenho suficiente")
    # Não incluir ruído de fundo na área de interesse.
    bbox = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
    crop = image.crop(bbox)
    max_side = size - 2 * margin
    if max_side <= 0:
        raise ValueError("size pequeno demais para a margem escolhida")
    crop.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    canvas = Image.new("L", (size, size), color=255)
    canvas.paste(crop, ((size - crop.width) // 2, (size - crop.height) // 2))
    return ImageOps.invert(canvas)


def create_variant(base: Image.Image, rng: random.Random) -> Image.Image:
    """Transformações geométricas limitadas; NÃO apaga segmentos da figura."""
    size = base.width
    angle = rng.uniform(-14.0, 14.0)
    factor = rng.uniform(0.88, 1.08)
    dx, dy = rng.randint(-3, 3), rng.randint(-3, 3)

    # A máscara possui fundo preto: fillcolor=0, sem ruído no fundo.
    img = base.rotate(angle, resample=Image.Resampling.BICUBIC, fillcolor=0)

    # Resize + colagem preservando toda a figura graças à margem inicial.
    new_size = max(1, round(size * factor))
    scaled = img.resize((new_size, new_size), Image.Resampling.BICUBIC)
    transformed = Image.new("L", (size, size), 0)
    transformed.paste(scaled, ((size - new_size) // 2, (size - new_size) // 2))

    # PIL affine desloca sem o wrap-around do ImageChops.offset.
    img = transformed.transform(
        (size, size),
        Image.Transform.AFFINE,
        (1, 0, -dx, 0, 1, -dy),
        resample=Image.Resampling.BICUBIC,
        fillcolor=0,
    )

    # Apenas engrossar eventualmente; reduzir via erosão pode apagar linhas.
    if rng.random() < 0.18:
        img = img.filter(ImageFilter.MaxFilter(3))
    if rng.random() < 0.10:
        img = img.filter(ImageFilter.GaussianBlur(radius=0.25))
    return img


def stats(mask: Image.Image) -> tuple[int, int, int, bool]:
    data = np.asarray(mask, dtype=np.uint8) > 70
    yy, xx = np.where(data)
    if len(xx) == 0:
        return 0, 0, 0, False
    width = int(xx.max() - xx.min() + 1)
    height = int(yy.max() - yy.min() + 1)
    edge = bool((xx.min() < 2) or (xx.max() > mask.width - 3)
                or (yy.min() < 2) or (yy.max() > mask.height - 3))
    return len(xx), width, height, edge


def acceptable(base: Image.Image, candidate: Image.Image) -> bool:
    b_count, b_width, b_height, _ = stats(base)
    count, width, height, touches_edge = stats(candidate)
    # Evita explicitamente artefatos tipo "quatro pontinhos".
    return (
        b_count >= 30
        and b_width >= 12
        and b_height >= 12
        and count >= max(30, int(b_count * 0.60))
        and count <= int(b_count * 1.90)
        and width >= max(12, int(b_width * 0.68))
        and height >= max(12, int(b_height * 0.68))
        and not touches_edge
    )


def save_as_black_on_white(mask: Image.Image, path: Path) -> None:
    # Traços pretos sobre fundo branco; os pixels preservam antialiasing.
    ImageOps.invert(mask).save(path)


def split_files(paths: list[Path], seed: int) -> dict[str, list[Path]]:
    if len(paths) < 3:
        raise ValueError("São necessárias pelo menos 3 imagens originais por classe")
    shuffled = paths[:]
    random.Random(seed).shuffle(shuffled)
    n = len(shuffled)
    n_train = min(n - 2, max(1, round(n * 0.70)))
    n_val = min(n - n_train - 1, max(1, round(n * 0.15)))
    return {
        "train": shuffled[:n_train],
        "val": shuffled[n_train:n_train + n_val],
        "test": shuffled[n_train + n_val:],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=INPUT_DIR)
    parser.add_argument("--output", type=Path, default=OUTPUT_DIR)
    parser.add_argument("--per-image", type=int, default=80)
    parser.add_argument("--size", type=int, default=64)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    if args.per_image < 0 or args.size < 32:
        parser.error("--per-image deve ser >= 0 e --size >= 32")
    if not args.input.is_dir():
        parser.error(f"A pasta não existe: {args.input}")
    if args.output.exists():
        parser.error(f"Saída já existe: {args.output}. Escolha outra --output para evitar misturar datasets.")

    sources = sorted(p for p in args.input.iterdir() if p.suffix.lower() in EXTENSIONS)
    groups = {c: [p for p in sources if label_for(p) == c] for c in CLASSES}
    for label, items in groups.items():
        if len(items) < 3:
            parser.error(f"Classe '{label}' tem apenas {len(items)} imagens; precisa de pelo menos 3")
    args.output.mkdir(parents=True, exist_ok=False)

    manifest: list[dict[str, str | int]] = []
    counts: Counter[tuple[str, str]] = Counter()
    rejected = 0
    for class_index, label in enumerate(CLASSES):
        splits = split_files(groups[label], args.seed + class_index)
        for split, originals in splits.items():
            out_dir = args.output / split / label
            out_dir.mkdir(parents=True, exist_ok=True)
            for source in originals:
                try:
                    base = normalize_original(source, args.size, margin=max(7, args.size // 6))
                except ValueError as exc:
                    raise SystemExit(f"Original inválido '{source}': {exc}") from exc
                if not acceptable(base, base):
                    raise SystemExit(f"Original suspeito após normalização: {source}. Verifique o PNG de origem.")
                stem = source.stem
                filename = f"{stem}_original.png"
                save_as_black_on_white(base, out_dir / filename)
                manifest.append(dict(path=f"{split}/{label}/{filename}", split=split,
                                     label=label, source=source.name, augmented=0))
                counts[(split, label)] += 1
                if split != "train":
                    continue

                # Independência das variações em relação à ordenação de arquivos.
                # Uma seed global já garante reprodutibilidade para inputs idênticos.
                rng = random.Random(args.seed * 1000003 + sources.index(source))
                for index in range(1, args.per_image + 1):
                    variant = None
                    for _ in range(25):
                        candidate = create_variant(base, rng)
                        if acceptable(base, candidate):
                            variant = candidate
                            break
                        rejected += 1
                    if variant is None:
                        raise SystemExit(f"Não consegui gerar variação válida de '{source}'. Inspecione o original.")
                    filename = f"{stem}_aug_{index:04d}.png"
                    save_as_black_on_white(variant, out_dir / filename)
                    manifest.append(dict(path=f"{split}/{label}/{filename}", split=split,
                                         label=label, source=source.name, augmented=1))
                    counts[(split, label)] += 1

    with (args.output / "manifest.csv").open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=["path", "split", "label", "source", "augmented"])
        writer.writeheader()
        writer.writerows(manifest)

    print(f"Dataset criado: {args.output.resolve()}")
    for split in ("train", "val", "test"):
        print(f"  {split:5}: " + " | ".join(f"{c}={counts[(split, c)]}" for c in CLASSES))
    print(f"  Variantes rejeitadas automaticamente: {rejected}")
    print("  Manifest: manifest.csv (classe, split, origem e augmentation)")
    print("  NOTA: Não geramos desenhos parciais a partir de PNGs finalizados.")


if __name__ == "__main__":
    main()
