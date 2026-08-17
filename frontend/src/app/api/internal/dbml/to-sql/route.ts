import { NextResponse } from "next/server";
import { DbmlConversionError, dbmlToSql } from "@/lib/dbml";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { dbml?: unknown; dialect?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const { dbml, dialect } = body;
  if (typeof dbml !== "string" || typeof dialect !== "string") {
    return NextResponse.json({ error: "Both dbml and dialect are required" }, { status: 400 });
  }

  try {
    const sql = dbmlToSql(dbml, dialect);
    return NextResponse.json({ sql });
  } catch (err) {
    if (err instanceof DbmlConversionError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal conversion error" }, { status: 500 });
  }
}
