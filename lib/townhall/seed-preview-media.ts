import type { DropPreviewMap, DropPreviewMode } from "@/lib/domain/contracts";

const SEED_PREVIEW_MEDIA_BY_DROP_ID: Record<string, DropPreviewMap> = {
  stardust: {
    watch: {
      type: "video",
      src: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      posterSrc: "https://picsum.photos/seed/ook-stardust/960/1600",
      alt: "stardust watch preview"
    },
    listen: {
      type: "audio",
      src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      posterSrc: "https://picsum.photos/seed/ook-stardust-listen/960/1600",
      alt: "stardust listen preview"
    },
    read: {
      type: "text",
      text: "episode one opens with stardust drifting through memory and identity."
    },
    photos: {
      type: "image",
      src: "https://picsum.photos/seed/ook-stardust-photos/1200/2000",
      alt: "stardust photos preview"
    },
    live: {
      type: "video",
      src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
      posterSrc: "https://picsum.photos/seed/ook-stardust-live/960/1600",
      alt: "stardust live preview"
    }
  },
  "twilight-whispers": {
    watch: {
      type: "video",
      src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
      posterSrc: "https://picsum.photos/seed/ook-twilight-watch/960/1600",
      alt: "twilight whispers watch preview"
    },
    listen: {
      type: "audio",
      src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
      posterSrc: "https://picsum.photos/seed/ook-twilight-listen/960/1600",
      alt: "twilight whispers listen preview"
    },
    read: {
      type: "text",
      text: "lights in the night traces water, memory, and a late-hour horizon."
    },
    photos: {
      type: "image",
      src: "https://picsum.photos/seed/ook-twilight-photos/1200/2000",
      alt: "twilight whispers photos preview"
    },
    live: {
      type: "video",
      src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
      posterSrc: "https://picsum.photos/seed/ook-twilight-live/960/1600",
      alt: "twilight whispers live preview"
    }
  },
  voidrunner: {
    watch: {
      type: "video",
      src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
      posterSrc: "https://picsum.photos/seed/ook-voidrunner-watch/960/1600",
      alt: "voidrunner watch preview"
    },
    listen: {
      type: "audio",
      src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
      posterSrc: "https://picsum.photos/seed/ook-voidrunner-listen/960/1600",
      alt: "voidrunner listen preview"
    },
    read: {
      type: "text",
      text: "a lone signal crosses worlds and leaves a trace in the feed."
    },
    photos: {
      type: "image",
      src: "https://picsum.photos/seed/ook-voidrunner-photos/1200/2000",
      alt: "voidrunner photos preview"
    },
    live: {
      type: "video",
      src: "https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
      posterSrc: "https://picsum.photos/seed/ook-voidrunner-live/960/1600",
      alt: "voidrunner live preview"
    }
  },
  "through-the-lens": {
    watch: {
      type: "video",
      src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
      posterSrc: "https://picsum.photos/seed/ook-through-lens-watch/960/1600",
      alt: "through the lens watch preview"
    },
    listen: {
      type: "audio",
      src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
      posterSrc: "https://picsum.photos/seed/ook-through-lens-listen/960/1600",
      alt: "through the lens listen preview"
    },
    read: {
      type: "text",
      text: "coffee table captures layered city voices from one shared moment."
    },
    photos: {
      type: "image",
      src: "https://picsum.photos/seed/ook-through-lens-photos/1200/2000",
      alt: "through the lens photos preview"
    },
    live: {
      type: "video",
      src: "https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
      posterSrc: "https://picsum.photos/seed/ook-through-lens-live/960/1600",
      alt: "through the lens live preview"
    }
  }
};

export function seedPreviewMediaForDrop(dropId: string): DropPreviewMap | undefined {
  const previewMedia = SEED_PREVIEW_MEDIA_BY_DROP_ID[dropId];
  if (!previewMedia) {
    return undefined;
  }

  const cloned: DropPreviewMap = {};
  for (const mode of Object.keys(previewMedia) as DropPreviewMode[]) {
    const asset = previewMedia[mode];
    if (asset) {
      cloned[mode] = { ...asset };
    }
  }

  return cloned;
}
