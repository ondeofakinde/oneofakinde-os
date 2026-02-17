import type { CommerceGateway } from "@/lib/domain/ports";
import { createBffGateway } from "@/lib/gateway/bff-client";
import { mockGateway } from "@/lib/gateway/mock-gateway";

export type GatewayProvider = "mock" | "bff";

function resolveProvider(): GatewayProvider {
  const input = process.env.OOK_GATEWAY_PROVIDER?.trim().toLowerCase();
  return input === "bff" ? "bff" : "mock";
}

export const gatewayProvider = resolveProvider();

export const gateway: CommerceGateway =
  gatewayProvider === "bff" ? createBffGateway() : mockGateway;
