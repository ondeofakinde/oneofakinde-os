import { parseTownhallOrderMode, type TownhallOrderMode } from "@/lib/townhall/order";

export type TownhallSearchParams = Record<string, string | string[] | undefined>;

export async function readTownhallOrderMode(
  searchParams?: Promise<TownhallSearchParams>
): Promise<TownhallOrderMode> {
  const resolved = searchParams ? await searchParams : undefined;
  return parseTownhallOrderMode(resolved?.order);
}
