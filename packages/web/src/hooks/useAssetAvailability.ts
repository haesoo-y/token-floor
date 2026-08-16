import { useEffect, useState } from "react";
import { findMissingAssets } from "../lib/assets.js";

export type AssetAvailability =
  { status: "checking" } | { status: "ready" } | { status: "missing"; files: string[] };

/** Checks that the locally licensed asset files required by the scene are browser-accessible. */
export function useAssetAvailability(): AssetAvailability {
  const [availability, setAvailability] = useState<AssetAvailability>({ status: "checking" });
  // The active guard prevents an asynchronous HEAD response from updating an unmounted screen.
  useEffect(() => {
    let active = true;
    void findMissingAssets((url) => fetch(url, { method: "HEAD" })).then((files) => {
      if (!active) return;
      setAvailability(files.length === 0 ? { status: "ready" } : { status: "missing", files });
    });
    return () => {
      active = false;
    };
  }, []);
  return availability;
}
