type EventFields = Record<string, unknown>;

const SENSITIVE_KEY_PATTERN = /(token|secret|signature|password|email|cookie|account|handle)/i;

function isObservabilityEnabled(): boolean {
  const configured = process.env.OOK_OBSERVABILITY_ENABLED?.trim().toLowerCase();
  if (configured === "true") return true;
  if (configured === "false") return false;
  return false;
}

function sanitize(value: unknown): unknown {
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item));
  }

  if (typeof value === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      sanitized[key] = SENSITIVE_KEY_PATTERN.test(key) ? "[redacted]" : sanitize(nested);
    }
    return sanitized;
  }

  return value;
}

export function emitOperationalEvent(event: string, fields: EventFields = {}): void {
  if (!isObservabilityEnabled()) {
    return;
  }

  const payload = {
    timestamp: new Date().toISOString(),
    event,
    fields: sanitize(fields)
  };

  console.info(`[ook.ops] ${JSON.stringify(payload)}`);
}
