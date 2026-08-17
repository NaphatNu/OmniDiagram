import { dbmlToSql, SqlExportDialect } from "./dbml";
import { DiagramKind } from "./types";

export type TextExportFormat = "dbml" | "mermaid" | "sql-postgres" | "sql-mysql" | "sql-mssql";
export type ImageExportFormat = "svg" | "png";
export type ExportFormat = TextExportFormat | ImageExportFormat;

const SCHEMA_EXPORT_FORMATS: ExportFormat[] = [
  "dbml",
  "sql-postgres",
  "sql-mysql",
  "sql-mssql",
  "svg",
  "png",
];

const GENERIC_EXPORT_FORMATS: ExportFormat[] = ["mermaid", "svg", "png"];

const SQL_DIALECT_BY_FORMAT: Record<"sql-postgres" | "sql-mysql" | "sql-mssql", SqlExportDialect> = {
  "sql-postgres": "postgres",
  "sql-mysql": "mysql",
  "sql-mssql": "mssql",
};

const EXTENSION_BY_FORMAT: Record<ExportFormat, string> = {
  dbml: "dbml",
  mermaid: "mmd",
  "sql-postgres": "postgres.sql",
  "sql-mysql": "mysql.sql",
  "sql-mssql": "mssql.sql",
  svg: "svg",
  png: "png",
};

export function exportFormatsFor(kind: DiagramKind): ExportFormat[] {
  return kind === "SchemaDiagram" ? SCHEMA_EXPORT_FORMATS : GENERIC_EXPORT_FORMATS;
}

export function isTextFormat(format: ExportFormat): format is TextExportFormat {
  return format !== "svg" && format !== "png";
}

export function sanitizeFilenameBase(title: string): string {
  const cleaned = title
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || "diagram";
}

export function filenameFor(title: string, format: ExportFormat): string {
  return `${sanitizeFilenameBase(title)}.${EXTENSION_BY_FORMAT[format]}`;
}

/**
 * Resolves the exportable text for a TextExportFormat. dbml/mermaid come
 * straight from the buffer; sql-* dialects go through dbmlToSql. Throws
 * DbmlConversionError on invalid DBML, same as the underlying conversion.
 */
export function textContentForFormat(format: TextExportFormat, content: string): string {
  if (format === "dbml" || format === "mermaid") {
    return content;
  }
  return dbmlToSql(content, SQL_DIALECT_BY_FORMAT[format]);
}

export function downloadText(filename: string, content: string, mimeType: string): void {
  downloadBlob(filename, new Blob([content], { type: mimeType }));
}

export function downloadDataUrl(filename: string, dataUrl: string): void {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  downloadDataUrl(filename, url);
  URL.revokeObjectURL(url);
}
