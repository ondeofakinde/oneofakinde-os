import type { Drop, DropPreviewMode } from "@/lib/domain/contracts";

export type TownhallSurfaceMode = "townhall" | DropPreviewMode;

const MODE_ORDER: DropPreviewMode[] = ["watch", "listen", "read", "gallery", "live"];

function availableDropModes(drop: Drop): DropPreviewMode[] {
  return MODE_ORDER.filter((mode) => Boolean(drop.previewMedia?.[mode]));
}

export function resolveDropModeForTownhallSurface(
  drop: Drop,
  index: number,
  surfaceMode: TownhallSurfaceMode
): DropPreviewMode {
  if (surfaceMode !== "townhall") {
    return surfaceMode;
  }

  const availableModes = availableDropModes(drop);
  if (availableModes.length === 0) {
    return MODE_ORDER[index % MODE_ORDER.length];
  }

  return availableModes[index % availableModes.length];
}

