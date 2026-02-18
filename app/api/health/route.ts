import { NextResponse } from "next/server";
import { getPersistenceBackend } from "@/lib/bff/persistence";

export async function GET() {
  const backend = getPersistenceBackend();
  return NextResponse.json({
    status: "ok",
    backend
  });
}
