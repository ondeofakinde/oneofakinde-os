import assert from "node:assert/strict";
import test from "node:test";
import type { Drop } from "../../lib/domain/contracts";
import {
  resolveWorldReadSequence,
  sortWorldDropsForRead
} from "../../lib/read/world-sequencing";

function makeDrop(input: {
  id: string;
  title: string;
  seasonLabel: string;
  episodeLabel: string;
  releaseDate: string;
}): Drop {
  return {
    id: input.id,
    title: input.title,
    seasonLabel: input.seasonLabel,
    episodeLabel: input.episodeLabel,
    releaseDate: input.releaseDate,
    studioHandle: "oneofakinde",
    worldId: "dark-matter",
    worldLabel: "dark matter",
    synopsis: `${input.title} synopsis`,
    priceUsd: 1.99
  };
}

test("proof: world read sequencing sorts chapters by release timeline", () => {
  const unordered = [
    makeDrop({
      id: "episode-3",
      title: "episode three",
      seasonLabel: "season one",
      episodeLabel: "episode three",
      releaseDate: "2026-02-12"
    }),
    makeDrop({
      id: "episode-1",
      title: "episode one",
      seasonLabel: "season one",
      episodeLabel: "episode one",
      releaseDate: "2026-02-10"
    }),
    makeDrop({
      id: "episode-2",
      title: "episode two",
      seasonLabel: "season one",
      episodeLabel: "episode two",
      releaseDate: "2026-02-11"
    })
  ];

  const ordered = sortWorldDropsForRead(unordered);
  assert.deepEqual(
    ordered.map((drop) => drop.id),
    ["episode-1", "episode-2", "episode-3"]
  );
});

test("proof: world read sequencing resolves previous/current/next chapter links", () => {
  const drop1 = makeDrop({
    id: "stardust",
    title: "stardust",
    seasonLabel: "season one",
    episodeLabel: "episode one",
    releaseDate: "2026-02-10"
  });
  const drop2 = makeDrop({
    id: "twilight-whispers",
    title: "twilight whispers",
    seasonLabel: "season one",
    episodeLabel: "episode two",
    releaseDate: "2026-02-11"
  });
  const drop3 = makeDrop({
    id: "voidrunner",
    title: "voidrunner",
    seasonLabel: "season one",
    episodeLabel: "episode three",
    releaseDate: "2026-02-12"
  });

  const sequence = resolveWorldReadSequence([drop3, drop2, drop1], "twilight-whispers");
  assert.equal(sequence.currentIndex, 1);
  assert.equal(sequence.previousDrop?.id, "stardust");
  assert.equal(sequence.currentDrop?.id, "twilight-whispers");
  assert.equal(sequence.nextDrop?.id, "voidrunner");
});
