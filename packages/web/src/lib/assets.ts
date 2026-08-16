export const metroCityAssetUrls = [
  "/vendor/metrocity/Interior/Demo/Image%20Sequence_002_0000.png",
  "/vendor/metrocity/MetroCity%202.0/Suit.png",
  "/vendor/metrocity/MetroCity%202.0/Suit1.png",
  "/vendor/metrocity/MetroCity%202.0/Hair.png"
] as const;

export async function findMissingAssets(
  request: (url: string) => Promise<{ ok: boolean }>
): Promise<string[]> {
  const results = await Promise.all(
    metroCityAssetUrls.map(async (url) => ({ url, ok: (await request(url)).ok }))
  );
  return results.filter((result) => !result.ok).map((result) => result.url);
}
