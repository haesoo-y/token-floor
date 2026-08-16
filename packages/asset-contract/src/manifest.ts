export interface AssetDefinition {
  path: string;
  width: number;
  height: number;
  required: boolean;
  frameSize?: number;
}

export interface AssetPackManifest {
  id: string;
  displayName: string;
  tileSize: number;
  files: readonly AssetDefinition[];
}

export const metroCityManifest: AssetPackManifest = {
  id: "metrocity-free-v2",
  displayName: "MetroCity Free Packs",
  tileSize: 32,
  files: [
    { path: "MetroCity 2.0/Hair.png", width: 768, height: 160, required: true, frameSize: 32 },
    { path: "MetroCity 2.0/Suit.png", width: 768, height: 128, required: true, frameSize: 32 },
    { path: "MetroCity 2.0/Suit1.png", width: 768, height: 160, required: true, frameSize: 32 },
    { path: "Interior/Home/TilesHouse.png", width: 512, height: 512, required: true },
    {
      path: "Interior/Home/LivingRoom1-Sheet.png",
      width: 384,
      height: 960,
      required: true
    },
    { path: "Interior/Home/LivingRoom-Sheet.png", width: 192, height: 96, required: true },
    { path: "Interior/Home/Cupboard-Sheet.png", width: 576, height: 96, required: true },
    { path: "Interior/Home/Doors-Sheet.png", width: 1344, height: 128, required: true },
    { path: "Interior/Home/Lights-Sheet.png", width: 384, height: 64, required: true },
    { path: "Interior/Home/Carpet-Sheet.png", width: 320, height: 64, required: true },
    { path: "Interior/Home/Windows-Sheet.png", width: 896, height: 64, required: true },
    { path: "Interior/Home/Flowers-Sheet.png", width: 384, height: 96, required: true },
    {
      path: "Interior/Home/Miscellaneous-Sheet.png",
      width: 640,
      height: 64,
      required: true
    },
    { path: "Interior/Home/Kitchen-Sheet.png", width: 1152, height: 96, required: false },
    { path: "Interior/Home/TV-Sheet.png", width: 256, height: 96, required: false }
  ]
};
