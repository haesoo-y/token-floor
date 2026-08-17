"""Build provider-colored subagent sheets without recoloring hair or skin."""

from collections import deque
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[3]
SOURCE_ROOT = ROOT / ".agents/private/asset-sources/token-floor/characters"
OUTPUT_ROOT = ROOT / "packages/web/public/assets/token-floor/characters"
FRAME_SIZE = 32
OUTFIT_SOURCE_TO_BLUE = {
    (159, 63, 49): (24, 49, 101),
    (178, 71, 55): (40, 82, 166),
    (225, 100, 81): (69, 142, 255),
}
CODEX_SUBAGENTS = ("mc-codex-sub-0", "mc-codex-sub-1")


def outfit_pixels(image: Image.Image, frame: int) -> set[tuple[int, int]]:
    """Find the shirt component connected to each frame's central torso."""
    pixels = image.load()
    offset_x = frame * FRAME_SIZE
    candidates = {
        (x, y)
        for y in range(16, 26)
        for x in range(8, 24)
        if pixels[offset_x + x, y][:3] in OUTFIT_SOURCE_TO_BLUE
    }
    seeds = {(x, y) for x, y in candidates if 13 <= x <= 18 and 19 <= y <= 23}
    connected = set(seeds)
    queue = deque(seeds)
    while queue:
        x, y = queue.popleft()
        for neighbor in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if neighbor in candidates and neighbor not in connected:
                connected.add(neighbor)
                queue.append(neighbor)
    return connected


def recolor_codex_subagent(source: Image.Image) -> Image.Image:
    """Recolor only connected torso garments while preserving authored animation pixels."""
    result = source.convert("RGBA")
    pixels = result.load()
    for frame in range(result.width // FRAME_SIZE):
        offset_x = frame * FRAME_SIZE
        for x, y in outfit_pixels(result, frame):
            red, green, blue, alpha = pixels[offset_x + x, y]
            pixels[offset_x + x, y] = (*OUTFIT_SOURCE_TO_BLUE[(red, green, blue)], alpha)
    return result


def main() -> None:
    for name in CODEX_SUBAGENTS:
        source = Image.open(SOURCE_ROOT / f"{name}-source.png")
        recolor_codex_subagent(source).save(OUTPUT_ROOT / f"{name}.png")


if __name__ == "__main__":
    main()
