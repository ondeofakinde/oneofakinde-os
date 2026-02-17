import { commerceGateway } from "@/lib/adapters/mock-commerce";
import type { CommerceGateway } from "@/lib/domain/ports";

export const mockGateway: CommerceGateway = commerceGateway;
