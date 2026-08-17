import { importer, exporter } from "@dbml/core";

/**
 * Dialects @dbml/core actually supports for SQL<->DBML conversion in this
 * installed version (10.1.x). "sqlite" is intentionally excluded: the
 * library silently returns an empty string for it instead of converting or
 * throwing, on both import and export, so it is not a usable dialect.
 */
const SQL_IMPORT_DIALECTS = ["postgres", "mysql", "mssql"] as const;
const SQL_EXPORT_DIALECTS = ["postgres", "mysql", "mssql"] as const;

export type SqlImportDialect = (typeof SQL_IMPORT_DIALECTS)[number];
export type SqlExportDialect = (typeof SQL_EXPORT_DIALECTS)[number];

export class DbmlConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DbmlConversionError";
  }
}

interface CompilerDiagLike {
  message?: string;
  text?: string;
  location?: { start?: { line?: number } };
}

function isDiagCarrier(err: unknown): err is { diags: CompilerDiagLike[] } {
  return (
    typeof err === "object" &&
    err !== null &&
    Array.isArray((err as { diags?: unknown }).diags)
  );
}

function describeParseError(err: unknown): string {
  if (isDiagCarrier(err) && err.diags.length > 0) {
    const diag = err.diags[0];
    const text = diag.message ?? diag.text ?? "invalid input";
    const line = diag.location?.start?.line;
    return line != null ? `Parse error at line ${line}: ${text}` : `Parse error: ${text}`;
  }
  if (err instanceof Error) {
    return `Parse error: ${err.message}`;
  }
  return "Parse error: invalid input";
}

export function sqlToDbml(sql: string, dialect: string): string {
  if (!sql.trim()) {
    throw new DbmlConversionError("SQL input must not be empty");
  }
  if (!(SQL_IMPORT_DIALECTS as readonly string[]).includes(dialect)) {
    throw new DbmlConversionError(`Unknown dialect: ${dialect}`);
  }
  try {
    return importer.import(sql, dialect as SqlImportDialect);
  } catch (err) {
    throw new DbmlConversionError(describeParseError(err));
  }
}

export function dbmlToSql(dbml: string, dialect: string): string {
  if (!dbml.trim()) {
    throw new DbmlConversionError("DBML input must not be empty");
  }
  if (!(SQL_EXPORT_DIALECTS as readonly string[]).includes(dialect)) {
    throw new DbmlConversionError(`Unknown dialect: ${dialect}`);
  }
  try {
    return exporter.export(dbml, dialect as SqlExportDialect);
  } catch (err) {
    throw new DbmlConversionError(describeParseError(err));
  }
}
