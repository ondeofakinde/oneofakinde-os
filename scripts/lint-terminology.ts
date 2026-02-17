import {
  collectTerminologyViolations,
  routeFromAppPage,
  type RouteDocument,
  type SurfaceMapLike
} from "../lib/terminology";
import fs from "node:fs";
import path from "node:path";

const configArg = process.argv[2] || "config/surface-map.generated.json";
const appArg = process.argv[3] || "app";

const configPath = path.resolve(process.cwd(), configArg);
const appRoot = path.resolve(process.cwd(), appArg);

if (!fs.existsSync(configPath)) {
  console.error(`missing surface map json: ${configPath}`);
  process.exit(1);
}

function walk(directoryPath: string, collector: string[] = []): string[] {
  if (!fs.existsSync(directoryPath)) return collector;

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

const surfaceMap = JSON.parse(fs.readFileSync(configPath, "utf8")) as SurfaceMapLike;
const routeFiles = walk(appRoot).filter((filePath) => filePath.endsWith("page.tsx"));

const routeDocuments: RouteDocument[] = routeFiles
  .map((filePath) => {
    const route = routeFromAppPage(filePath, appRoot);
    if (!route) return null;

    return {
      filePath,
      route,
      content: fs.readFileSync(filePath, "utf8")
    };
  })
  .filter((item): item is RouteDocument => item !== null);

const violations = collectTerminologyViolations(surfaceMap, routeDocuments);

if (violations.length > 0) {
  console.error(`terminology lint failed with ${violations.length} issue(s):`);
  for (const violation of violations) {
    console.error(`- ${violation.filePath} [${violation.route}] ${violation.message}`);
  }
  process.exit(1);
}

console.log(`terminology lint passed (${routeDocuments.length} route page file(s) checked).`);
