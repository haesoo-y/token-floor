"""Recolor approved character sheets into three black-haired player options."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).parents[1]
CHARACTERS = ROOT / "public/assets/token-floor/characters"

BLACK_HAIR = (
    (18, 20, 24, 255),
    (31, 35, 41, 255),
    (48, 53, 61, 255),
    (68, 74, 84, 255),
    (88, 94, 105, 255),
    (102, 109, 121, 255),
    (116, 124, 137, 255),
    (132, 140, 153, 255),
)

OPTIONS = (
    (
        "rose",
        "onyx",
        ((50, 0, 0), (75, 8, 2), (100, 23, 3), (122, 37, 0)),
        {
            (178, 71, 55): (20, 120, 125),
            (225, 100, 81): (40, 190, 195),
            (159, 63, 49): (16, 92, 98),
            (248, 93, 155): (35, 61, 92),
            (224, 84, 140): (45, 79, 118),
            (182, 69, 114): (28, 48, 73),
        },
    ),
    (
        "cyan",
        "raven",
        (
            (68, 19, 25),
            (69, 27, 29),
            (158, 81, 13),
            (159, 84, 19),
            (204, 116, 29),
            (251, 163, 39),
        ),
        {
            (26, 129, 135): (143, 111, 28),
            (46, 225, 234): (225, 181, 57),
            (12, 60, 62): (72, 73, 31),
            (19, 92, 96): (104, 94, 31),
            (42, 203, 211): (199, 151, 43),
            (34, 165, 172): (169, 132, 37),
        },
    ),
    (
        "violet",
        "noir",
        (
            (68, 19, 25),
            (89, 26, 34),
            (158, 81, 13),
            (189, 96, 15),
            (204, 116, 29),
            (182, 115, 82),
            (232, 148, 30),
            (251, 163, 39),
        ),
        {
            (178, 71, 55): (42, 91, 155),
            (225, 100, 81): (70, 125, 196),
            (159, 63, 49): (31, 72, 125),
            (54, 38, 92): (65, 70, 80),
            (41, 29, 70): (48, 52, 60),
            (63, 44, 108): (84, 90, 102),
        },
    ),
)


def recolor(source: Image.Image, hair: tuple[tuple[int, int, int], ...], clothes: dict) -> Image.Image:
    """Apply exact palette replacements without changing authored silhouettes or frame geometry."""
    result = source.convert("RGBA")
    hair_map = {color: BLACK_HAIR[index] for index, color in enumerate(hair)}
    pixels = result.load()
    for y in range(result.height):
        for x in range(result.width):
            red, green, blue, alpha = pixels[x, y]
            rgb = (red, green, blue)
            if rgb in hair_map:
                pixels[x, y] = hair_map[rgb]
            elif rgb in clothes:
                pixels[x, y] = (*clothes[rgb], alpha)
    return result


def main() -> None:
    for source_name, output_name, hair, clothes in OPTIONS:
        source = Image.open(CHARACTERS / f"mc-player-{source_name}.png")
        recolor(source, hair, clothes).save(CHARACTERS / f"mc-player-{output_name}.png")


if __name__ == "__main__":
    main()
