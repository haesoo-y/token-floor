const root = "/assets/token-floor";
const characterRoot = `${root}/characters`;

const characterNames = [
  "mc-codex-main-0",
  "mc-codex-main-1",
  "mc-codex-sub-0",
  "mc-codex-sub-1",
  "mc-codex-npc",
  "mc-claude-main-0",
  "mc-claude-main-1",
  "mc-claude-sub-0",
  "mc-claude-sub-1",
  "mc-claude-npc",
  "mc-player-onyx",
  "mc-player-raven",
  "mc-player-noir"
] as const;

export const officeAssets = {
  floors: [
    { key: "floor-work", url: `${root}/office-floor.png` },
    { key: "floor-lounge", url: `${root}/office-floor-blue.png` },
    { key: "floor-passage", url: `${root}/office-floor-teal.png` }
  ],
  images: [
    { key: "whiteboard", url: `${root}/furniture-whiteboard.png` },
    { key: "meeting-table", url: `${root}/furniture-meeting-table.png` },
    { key: "plant", url: `${root}/furniture-plant.png` },
    { key: "plant-small", url: `${root}/furniture-plant-small.png` }
  ],
  sheets: [
    ...characterNames.map((name) => ({
      key: name,
      url: `${characterRoot}/${name}.png`,
      frameWidth: 32,
      frameHeight: 32
    }))
  ]
} as const;

export const gameAssetUrls = [
  ...officeAssets.floors.map((asset) => asset.url),
  ...officeAssets.images.map((asset) => asset.url),
  ...officeAssets.sheets.map((asset) => asset.url)
];

export async function findMissingAssets(
  request: (url: string) => Promise<{ ok: boolean }>
): Promise<string[]> {
  const results = await Promise.all(
    gameAssetUrls.map(async (url) => ({ url, ok: (await request(url)).ok }))
  );
  return results.filter((result) => !result.ok).map((result) => result.url);
}
