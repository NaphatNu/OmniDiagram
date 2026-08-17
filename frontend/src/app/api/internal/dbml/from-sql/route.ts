import { NextResponse } from "next/server";
import { DbmlConversionError, sqlToDbml } from "@/lib/dbml";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { sql?: unknown; dialect?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const { sql, dialect } = body;
  if (typeof sql !== "string" || typeof dialect !== "string") {
    return NextResponse.json({ error: "Both sql and dialect are required" }, { status: 400 });
  }

  try {
    const dbml = sqlToDbml(sql, dialect);
    return NextResponse.json({ dbml });
  } catch (err) {
    if (err instanceof DbmlConversionError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal conversion error" }, { status: 500 });
  }
}
