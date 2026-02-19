import type { CommerceGateway } from "@/lib/domain/ports";
import { createBffGateway } from "@/lib/gateway/bff-client";
import { mockGateway } from "@/lib/gateway/mock-gateway";

export type GatewayProvider = "mock" | "bff";

function isProductionRuntime(): boolean {
  const appEnv = process.env.OOK_APP_ENV?.trim().toLowerCase();
  const vercelEnv = process.env.VERCEL_ENV?.trim().toLowerCase();
  return appEnv === "production" || vercelEnv === "production";
}

function resolveProvider(): GatewayProvider {
  const input = process.env.OOK_GATEWAY_PROVIDER?.trim().toLowerCase();
  if (input === "bff" || input === "mock") {
    return input;
  }

  return isProductionRuntime() ? "bff" : "mock";
}

export const gatewayProvider = resolveProvider();

export const gateway: CommerceGateway =
  gatewayProvider === "bff" ? createBffGateway() : mockGateway;
