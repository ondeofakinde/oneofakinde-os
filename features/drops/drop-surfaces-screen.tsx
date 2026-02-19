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
  bullets: string[];
};

type DropSurfaceScreenProps = {
  drop: Drop;
  session: Session | null;
  surface: DropSurfaceKey;
};

const SURFACE_CONTENT: Record<DropSurfaceKey, DropSurfaceContent> = {
  details: {
    title: "details",
    subtitle: "drop details and story context",
    bullets: [
      "season and episode framing",
      "story synopsis and release context",
      "world placement and studio context"
    ]
  },
  properties: {
    title: "properties",
    subtitle: "fixed metadata and provenance",
    bullets: ["creator handle and world id", "release timestamp", "supply and rights metadata"]
  },
  offers: {
    title: "offers",
    subtitle: "active offers and intent",
    bullets: ["open offers from collectors", "latest accepted price", "purchase routing"]
  },
  activity: {
    title: "activity",
    subtitle: "timeline and transfer events",
    bullets: ["mint and ownership timeline", "certificate status changes", "market actions"]
  },
  preview: {
    title: "preview",
    subtitle: "public-safe preview content",
    bullets: ["watermarked sample media", "teaser synopsis", "buy and watch routing"]
  },
  photos_preview: {
    title: "gallery preview",
    subtitle: "public-safe still-image preview",
    bullets: ["curated still-image slices", "teaser card for gallery mode", "buy and access routing"]
  }
};

function navClass(isActive: boolean): string {
  return `dropflow-tab ${isActive ? "active" : ""}`;
}

export function DropSurfaceScreen({ drop, session, surface }: DropSurfaceScreenProps) {
  const content = SURFACE_CONTENT[surface];
  const watchHref = session ? routes.dropWatch(drop.id) : routes.signIn(routes.dropWatch(drop.id));
  const buyHref = session ? routes.buyDrop(drop.id) : routes.signIn(routes.buyDrop(drop.id));

  const links = [
    { key: "details", label: "details", href: routes.dropDetails(drop.id) },
    { key: "properties", label: "properties", href: routes.dropProperties(drop.id) },
    { key: "offers", label: "offers", href: routes.dropOffers(drop.id) },
    { key: "activity", label: "activity", href: routes.dropActivity(drop.id) },
    { key: "preview", label: "preview", href: routes.dropPreview(drop.id) },
    { key: "photos_preview", label: "gallery preview", href: routes.dropPreviewPhotos(drop.id) }
  ] as const;

  return (
    <main className="dropflow-page">
      <section className="dropflow-phone-shell" aria-label={`${content.title} surface`}>
        <header className="dropflow-header">
          <Link href={routes.drop(drop.id)} className="dropflow-icon-link" aria-label="back to drop">
            ←
          </Link>
          <p className="dropflow-brand">oneofakinde</p>
          <Link href={routes.townhall()} className="dropflow-icon-link" aria-label="open townhall">
            ⌕
          </Link>
        </header>

        <section className="dropflow-stage compact">
          <div className="dropflow-backdrop" />
          <div className="dropflow-overlay" />
          <div className="dropflow-content">
            <p className="dropflow-meta">{content.subtitle}</p>
            <h1 className="dropflow-title">{drop.title}</h1>
            <p className="dropflow-subtitle">{content.title}</p>
            <p className="dropflow-synopsis">{drop.synopsis}</p>
            <p className="dropflow-meta">@{drop.studioHandle} · {drop.worldLabel}</p>
          </div>
        </section>

        <nav className="dropflow-tabs" aria-label="drop section tabs">
          {links.map((item) => (
            <Link key={item.key} href={item.href} className={navClass(item.key === surface)}>
              {item.label}
            </Link>
          ))}
        </nav>

        <section className="dropflow-panel" aria-label={`${content.title} panel`}>
          <div className="dropflow-panel-head">
            <p>{content.title}</p>
            <span>{formatUsd(drop.priceUsd)}</span>
          </div>

          <ul className="dropflow-bullet-list">
            {content.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>

          <div className="dropflow-cta-row">
            <Link href={buyHref} className="dropflow-primary-cta">
              buy now
            </Link>
            <Link href={watchHref} className="dropflow-secondary-cta">
              watch
            </Link>
            <Link href={routes.drop(drop.id)} className="dropflow-secondary-cta">
              open drop
            </Link>
          </div>
        </section>
      </section>

      <aside className="dropflow-side-notes" aria-label="surface notes">
        <h2>{content.title}</h2>
        <p>{content.subtitle}</p>
      </aside>
    </main>
  );
}
