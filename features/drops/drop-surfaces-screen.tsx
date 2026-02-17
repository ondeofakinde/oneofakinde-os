import { AppShell } from "@/features/shell/app-shell";
import { formatUsd } from "@/features/shared/format";
import type { Drop, Session } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

type DropSurfaceKey =
  | "details"
  | "properties"
  | "offers"
  | "activity"
  | "preview"
  | "photos_preview";

type DropSurfaceContent = {
  title: string;
  subtitle: string;
  note: string;
};

type DropSurfaceScreenProps = {
  drop: Drop;
  session: Session | null;
  surface: DropSurfaceKey;
};

const SURFACE_CONTENT: Record<DropSurfaceKey, DropSurfaceContent> = {
  details: {
    title: "details",
    subtitle: "drop details surface",
    note: "details describe this drop storyline, world context, and published metadata."
  },
  properties: {
    title: "properties",
    subtitle: "drop properties surface",
    note: "properties map fixed fields and provenance metadata for this drop."
  },
  offers: {
    title: "offers",
    subtitle: "drop offers surface",
    note: "offers summarize purchase and listing intents around this drop."
  },
  activity: {
    title: "activity",
    subtitle: "drop activity surface",
    note: "activity tracks timeline events, certificates, and transfer actions."
  },
  preview: {
    title: "preview",
    subtitle: "safe preview surface",
    note: "preview exposes public-safe snippets before watch entitlement."
  },
  photos_preview: {
    title: "photos preview",
    subtitle: "photos preview surface",
    note: "photos preview gives public-safe photo snippets for this drop."
  }
};

function navClass(isActive: boolean): string {
  return `slice-link ${isActive ? "active" : ""}`;
}

export function DropSurfaceScreen({ drop, session, surface }: DropSurfaceScreenProps) {
  const content = SURFACE_CONTENT[surface];

  const links = [
    { key: "details", label: "details", href: routes.dropDetails(drop.id) },
    { key: "properties", label: "properties", href: routes.dropProperties(drop.id) },
    { key: "offers", label: "offers", href: routes.dropOffers(drop.id) },
    { key: "activity", label: "activity", href: routes.dropActivity(drop.id) },
    { key: "preview", label: "preview", href: routes.dropPreview(drop.id) },
    { key: "photos_preview", label: "photos preview", href: routes.dropPreviewPhotos(drop.id) }
  ] as const;

  return (
    <AppShell
      title={content.title}
      subtitle={content.subtitle}
      session={session}
      activeNav="explore"
    >
      <section className="slice-panel">
        <p className="slice-label">{drop.seasonLabel}</p>
        <h2 className="slice-title">{drop.title}</h2>
        <p className="slice-copy">{content.note}</p>

        <div className="slice-nav-grid" aria-label="drop surface navigation">
          {links.map((item) => (
            <Link key={item.key} href={item.href} className={navClass(item.key === surface)}>
              {item.label}
            </Link>
          ))}
        </div>

        <dl className="slice-list">
          <div>
            <dt>world</dt>
            <dd>{drop.worldLabel}</dd>
          </div>
          <div>
            <dt>studio</dt>
            <dd>@{drop.studioHandle}</dd>
          </div>
          <div>
            <dt>price</dt>
            <dd>{formatUsd(drop.priceUsd)}</dd>
          </div>
          <div>
            <dt>release</dt>
            <dd>{drop.releaseDate}</dd>
          </div>
        </dl>

        <div className="slice-button-row">
          <Link href={routes.drop(drop.id)} className="slice-button ghost">
            open drop
          </Link>
          <Link href={routes.buyDrop(drop.id)} className="slice-button alt">
            buy
          </Link>
          <Link href={routes.dropWatch(drop.id)} className="slice-button alt">
            watch
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
