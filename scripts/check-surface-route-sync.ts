import fs from "node:fs";
import path from "node:path";
import { routeFromAppPage } from "../lib/terminology";

type SurfaceMap = {
  surfaces: Array<{ route: string }>;
  legacy_redirects?: Record<string, string>;
};

const mapArg = process.argv[2] || "config/surface-map.generated.json";
const appArg = process.argv[3] || "app";

const mapPath = path.resolve(process.cwd(), mapArg);
const appRoot = path.resolve(process.cwd(), appArg);

if (!fs.existsSync(mapPath)) {
  console.error(`missing surface map: ${mapPath}`);
  process.exit(1);
}

if (!fs.existsSync(appRoot)) {
  console.error(`missing app root: ${appRoot}`);
  process.exit(1);
}

const surfaceMap = JSON.parse(fs.readFileSync(mapPath, "utf8")) as SurfaceMap;

function walk(directoryPath: string, collector: string[] = []): string[] {
  for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
    const fullPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, collector);
      continue;
    }
    collector.push(fullPath);
  }
  return collector;
}

const pageRoutes = new Set(
  walk(appRoot)
    .filter((filePath) => filePath.endsWith("page.tsx"))
    .map((filePath) => routeFromAppPage(filePath, appRoot))
    .filter((route): route is string => typeof route === "string")
);

const canonicalRoutes = new Set(surfaceMap.surfaces.map((surface) => surface.route));
const legacyRoutes = new Set(Object.keys(surfaceMap.legacy_redirects ?? {}));

const missingPages = [...canonicalRoutes].filter((route) => !pageRoutes.has(route));
const untrackedPages = [...pageRoutes].filter(
  (route) => !canonicalRoutes.has(route) && !legacyRoutes.has(route)
);

if (missingPages.length > 0 || untrackedPages.length > 0) {
  if (missingPages.length > 0) {
    console.error("surface routes missing page.tsx files:");
    for (const route of missingPages) {
      console.error(`- ${route}`);
    }
  }

  if (untrackedPages.length > 0) {
    console.error("app routes missing from surface map (canonical or legacy):");
    for (const route of untrackedPages) {
      console.error(`- ${route}`);
    }
  }

  process.exit(1);
}

console.log(
  `surface route sync passed (${canonicalRoutes.size} canonical routes, ${legacyRoutes.size} legacy routes, ${pageRoutes.size} page routes).`
);
