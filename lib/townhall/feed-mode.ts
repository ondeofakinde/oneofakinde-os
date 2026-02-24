import type { Drop, DropPreviewMode } from "@/lib/domain/contracts";

export type TownhallSurfaceMode = "townhall" | DropPreviewMode;

const MODE_ORDER: DropPreviewMode[] = ["watch", "listen", "read", "photos", "live"];
const TOWNHALL_PRIMARY_ORDER: DropPreviewMode[] = ["watch", "photos", "live", "listen", "read"];

function availableDropModes(drop: Drop): DropPreviewMode[] {
  return MODE_ORDER.filter((mode) => Boolean(drop.previewMedia?.[mode]));
}

export function resolveDropModeForTownhallSurface(
  drop: Drop,
  _index: number,
  surfaceMode: TownhallSurfaceMode
): DropPreviewMode {
  if (surfaceMode !== "townhall") {
    return surfaceMode;
  }

  const availableModes = availableDropModes(drop);
  if (availableModes.length === 0) {
    return "watch";
  }

  for (const mode of TOWNHALL_PRIMARY_ORDER) {
    if (availableModes.includes(mode)) {
      return mode;
    }
  }

  return availableModes[0] ?? "watch";
}
