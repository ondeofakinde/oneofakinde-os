import fs from "node:fs";
import path from "node:path";

const DEFAULT_SOURCE = "config/surface-map.source.txt";
const DEFAULT_OUTPUT = "config/surface-map.generated.json";

const sourcePath = process.argv[2] || process.env.SURFACE_MAP_SOURCE || DEFAULT_SOURCE;
const outputPath = process.argv[3] || process.env.SURFACE_MAP_OUTPUT || DEFAULT_OUTPUT;

function stripInlineComment(line) {
  let inQuote = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const prev = i > 0 ? line[i - 1] : "";
    if (ch === '"' && prev !== "\\") {
      inQuote = !inQuote;
    }
    if (ch === "#" && !inQuote) {
      return line.slice(0, i).trimEnd();
    }
  }
  return line.trimEnd();
}

function quotedStrings(input) {
  return [...input.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

function parseBool(input) {
  return /^true$/i.test(input.trim());
}

function blockRange(lines, marker) {
  const index = lines.findIndex((line) => line.trim() === marker);
  return index;
}

function parseMetadata(lines) {
  const out = {};
  for (const line of lines) {
    const clean = stripInlineComment(line).trim();
    if (!clean) continue;

    if (clean === "locked_glossary:") {
      break;
    }

    const match = clean.match(/^(format|last_updated|notes):\s*(.+)$/i);
    if (!match) continue;

    out[match[1]] = match[2].replace(/^"|"$/g, "");
  }
  return out;
}

function parseLockedGlossary(lines, start, end) {
  const result = {
    nouns: {},
    banned_ui_nouns: {},
    allowed_ui_phrases: []
  };

  let mode = "";
  for (let i = start + 1; i < end; i += 1) {
    const raw = stripInlineComment(lines[i]);
    const line = raw.trim();
    if (!line) continue;

    if (line === "nouns:") {
      mode = "nouns";
      continue;
    }
    if (line === "banned_ui_nouns:") {
      mode = "banned";
      continue;
    }
    if (line === "allowed_ui_phrases:") {
      mode = "allowed";
      continue;
    }

    if (mode === "nouns") {
      const match = line.match(/^([a-z_]+):\s*"([^"]*)"$/i);
      if (match) {
        result.nouns[match[1]] = match[2];
      }
      continue;
    }

    if (mode === "banned") {
      const keyMatch = line.match(/^([a-z_]+):\s*\{(.+)\}$/i);
      if (!keyMatch) continue;
      const key = keyMatch[1];
      const body = keyMatch[2];
      const item = {};
      for (const part of body.split(",")) {
        const pair = part.trim().match(/^([a-z_]+):\s*"([^"]*)"$/i);
        if (pair) {
          item[pair[1]] = pair[2];
        }
      }
      result.banned_ui_nouns[key] = item;
      continue;
    }

    if (mode === "allowed" && line.startsWith("-")) {
      const values = quotedStrings(line);
      if (values[0]) {
        result.allowed_ui_phrases.push(values[0]);
      }
    }
  }

  return result;
}

function parseLinterMatching(lines, start, end) {
  const result = {
    case_insensitive: true,
    whole_word: true,
    include_variants: [],
    include_ui_phrases: []
  };

  let mode = "";
  for (let i = start + 1; i < end; i += 1) {
    const raw = stripInlineComment(lines[i]);
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith("case_insensitive:")) {
      result.case_insensitive = parseBool(line.split(":")[1] || "true");
      continue;
    }
    if (line.startsWith("whole_word:")) {
      result.whole_word = parseBool(line.split(":")[1] || "true");
      continue;
    }

    if (line === "include_variants:") {
      mode = "variants";
      continue;
    }
    if (line === "include_ui_phrases:") {
      mode = "phrases";
      continue;
    }

    if (mode === "variants" && line.startsWith("-")) {
      const base = line.match(/base:\s*"([^"]+)"/i)?.[1];
      const variantsSection = line.match(/variants:\s*\[(.*)\]/i)?.[1] || "";
      const variants = quotedStrings(variantsSection);
      if (base) {
        result.include_variants.push({ base, variants });
      }
      continue;
    }

    if (mode === "phrases" && line.startsWith("-")) {
      const phrase = quotedStrings(line)[0];
      if (phrase) {
        result.include_ui_phrases.push(phrase);
      }
    }
  }

  return result;
}

function parseExceptions(lines, start, end) {
  const result = {
    by_route: {},
    by_context: {}
  };

  let mode = "";
  let currentRoute = "";
  let currentContext = "";

  for (let i = start + 1; i < end; i += 1) {
    const raw = stripInlineComment(lines[i]);
    const line = raw.trim();
    if (!line) continue;

    if (line === "by_route:") {
      mode = "by_route";
      currentRoute = "";
      continue;
    }
    if (line === "by_context:") {
      mode = "by_context";
      currentContext = "";
      continue;
    }

    if (mode === "by_route") {
      const routeMatch = line.match(/^"([^"]+)":$/);
      if (routeMatch) {
        currentRoute = routeMatch[1];
        result.by_route[currentRoute] = { allow_terms: [] };
        continue;
      }

      if (line.startsWith("allow_terms:") && currentRoute) {
        result.by_route[currentRoute].allow_terms = quotedStrings(line);
      }
      continue;
    }

    if (mode === "by_context") {
      const contextMatch = line.match(/^([a-z_]+):$/i);
      if (contextMatch) {
        currentContext = contextMatch[1];
        result.by_context[currentContext] = {};
        continue;
      }

      if (!currentContext) continue;

      if (line.startsWith("allow_terms:")) {
        result.by_context[currentContext].allow_terms = quotedStrings(line);
        continue;
      }

      const forbid = line.match(/^forbid_as_consumable_noun:\s*(true|false)$/i);
      if (forbid) {
        result.by_context[currentContext].forbid_as_consumable_noun = parseBool(forbid[1]);
      }
    }
  }

  return result;
}

function parseSurfaces(lines, start, end) {
  const surfaces = [];
  let current = null;
  let inRules = false;
  let currentRule = null;

  for (let i = start + 1; i < end; i += 1) {
    const clean = stripInlineComment(lines[i]);
    const line = clean.trim();
    if (!line || line.startsWith("#")) continue;

    const routeMatch = line.match(/^- route:\s*"([^"]+)"$/);
    if (routeMatch) {
      if (current) surfaces.push(current);
      current = {
        route: routeMatch[1],
        legacy_routes: [],
        surface_key: "",
        ui_title: "",
        ui_nouns: [],
        lint_targets: [],
        roles: [],
        public_safe: false,
        contract_deps: [],
        proof_ids: [],
        rules: []
      };
      inRules = false;
      currentRule = null;
      continue;
    }

    if (!current) continue;

    const parseString = (prefix, key) => {
      const match = line.match(new RegExp(`^${prefix}\\s*:\\s*"([^"]+)"$`));
      if (match) current[key] = match[1];
      return Boolean(match);
    };

    if (parseString("surface_key", "surface_key")) continue;
    if (parseString("ui_title", "ui_title")) continue;

    const parseArray = (prefix, key) => {
      if (!line.startsWith(`${prefix}:`)) return false;
      current[key] = quotedStrings(line);
      return true;
    };

    if (parseArray("legacy_routes", "legacy_routes")) continue;
    if (parseArray("ui_nouns", "ui_nouns")) continue;
    if (parseArray("lint_targets", "lint_targets")) continue;
    if (parseArray("roles", "roles")) continue;
    if (parseArray("contract_deps", "contract_deps")) continue;
    if (parseArray("proof_ids", "proof_ids")) continue;

    const publicSafe = line.match(/^public_safe:\s*(true|false)$/i);
    if (publicSafe) {
      current.public_safe = parseBool(publicSafe[1]);
      continue;
    }

    if (line === "rules:") {
      inRules = true;
      currentRule = null;
      continue;
    }

    if (inRules) {
      const kindMatch = line.match(/^- kind:\s*"([^"]+)"$/i);
      if (kindMatch) {
        currentRule = { kind: kindMatch[1] };
        current.rules.push(currentRule);
        continue;
      }

      if (!currentRule) continue;

      if (line.startsWith("terms:")) {
        currentRule.terms = quotedStrings(line);
        continue;
      }

      const contextMatch = line.match(/^context:\s*"([^"]+)"$/i);
      if (contextMatch) {
        currentRule.context = contextMatch[1];
        continue;
      }

      const replaceMatch = line.match(/^replace_with:\s*"([^"]+)"$/i);
      if (replaceMatch) {
        currentRule.replace_with = replaceMatch[1];
      }
    }
  }

  if (current) surfaces.push(current);
  return surfaces;
}

function parseEnforcementChecklist(lines, start, end) {
  const result = {
    designers: [],
    engineers: []
  };

  let mode = "";
  for (let i = start + 1; i < end; i += 1) {
    const line = stripInlineComment(lines[i]).trim();
    if (!line) continue;

    if (line === "designers:") {
      mode = "designers";
      continue;
    }
    if (line === "engineers:") {
      mode = "engineers";
      continue;
    }

    if (line.startsWith("-") && (mode === "designers" || mode === "engineers")) {
      const item = quotedStrings(line)[0];
      if (item) {
        result[mode].push(item);
      }
    }
  }

  return result;
}

const sourceText = fs.readFileSync(sourcePath, "utf8");
const lines = sourceText.split(/\r?\n/);

const idxGlossary = blockRange(lines, "locked_glossary:");
const idxLinter = blockRange(lines, "linter_matching:");
const idxExceptions = blockRange(lines, "exceptions:");
const idxSurfaces = blockRange(lines, "surfaces:");
const idxChecklist = blockRange(lines, "enforcement_checklist:");

if ([idxGlossary, idxLinter, idxExceptions, idxSurfaces, idxChecklist].some((index) => index < 0)) {
  throw new Error("Surface map format has changed: required block markers were not found.");
}

const metadata = parseMetadata(lines);
const lockedGlossary = parseLockedGlossary(lines, idxGlossary, idxLinter);
const linterMatching = parseLinterMatching(lines, idxLinter, idxExceptions);
const exceptions = parseExceptions(lines, idxExceptions, idxSurfaces);
const surfaces = parseSurfaces(lines, idxSurfaces, idxChecklist);
const enforcementChecklist = parseEnforcementChecklist(lines, idxChecklist, lines.length);

const legacyRedirects = {};
for (const surface of surfaces) {
  for (const legacyRoute of surface.legacy_routes || []) {
    legacyRedirects[legacyRoute] = surface.route;
  }
}

const canonDeps = [...new Set(
  surfaces
    .flatMap((surface) => surface.contract_deps || [])
    .filter((dep) => dep.startsWith("canon_"))
)].sort();

const output = {
  generated_at: new Date().toISOString(),
  source_path: sourcePath,
  source_metadata: metadata,
  locked_glossary: lockedGlossary,
  linter_matching: linterMatching,
  exceptions,
  surfaces,
  enforcement_checklist: enforcementChecklist,
  legacy_redirects: legacyRedirects,
  session_required_route_patterns: surfaces
    .filter((surface) => surface.proof_ids.includes("p_session_required"))
    .map((surface) => surface.route),
  public_safe_route_patterns: surfaces
    .filter((surface) => surface.public_safe)
    .map((surface) => surface.route),
  canon_dependencies: canonDeps,
  stats: {
    route_count: surfaces.length,
    public_safe_count: surfaces.filter((surface) => surface.public_safe).length,
    session_required_count: surfaces.filter((surface) =>
      surface.proof_ids.includes("p_session_required")
    ).length,
    legacy_redirect_count: Object.keys(legacyRedirects).length
  }
};

const absoluteOutputPath = path.resolve(process.cwd(), outputPath);
fs.mkdirSync(path.dirname(absoluteOutputPath), { recursive: true });
fs.writeFileSync(absoluteOutputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

console.log(`generated ${absoluteOutputPath}`);
console.log(`routes: ${output.stats.route_count}`);
console.log(`legacy redirects: ${output.stats.legacy_redirect_count}`);
