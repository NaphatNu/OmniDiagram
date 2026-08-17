package dev.omnidiagram.backend.mcp;

import dev.omnidiagram.backend.conversion.DbmlConversionClient;
import dev.omnidiagram.backend.diagram.Diagram;
import dev.omnidiagram.backend.diagram.DiagramKind;
import dev.omnidiagram.backend.diagram.DiagramService;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

@Component
public class DiagramTools {

	private static final String DEFAULT_TITLE = "Untitled diagram";

	/**
	 * Public MCP format names for SQL, mapped to the dialect names the conversion
	 * service (and @dbml/core underneath it) expects. Used for both import
	 * (create_diagram/update_diagram) and export.
	 */
	private static final Map<String, String> SQL_FORMAT_DIALECTS = Map.of("sql-postgres", "postgres", "sql-mysql",
			"mysql", "sql-sqlserver", "mssql");

	private final DiagramService diagramService;
	private final DbmlConversionClient dbmlConversionClient;

	public DiagramTools(DiagramService diagramService, DbmlConversionClient dbmlConversionClient) {
		this.diagramService = diagramService;
		this.dbmlConversionClient = dbmlConversionClient;
	}

	@Tool(name = "list_diagrams", description = "List every Diagram, no pagination or filtering")
	public List<DiagramToolSummary> listDiagrams() {
		return diagramService.listAll().stream().map(DiagramToolSummary::from).toList();
	}

	@Tool(name = "get_diagram", description = "Get a Diagram by its internal id")
	public DiagramToolResult getDiagram(@ToolParam(description = "Internal Diagram id") UUID id) {
		return DiagramToolResult.from(diagramService.getById(id));
	}

	@Tool(name = "create_diagram", description = "Create a new Diagram")
	public DiagramToolResult createDiagram(
			@ToolParam(description = "SchemaDiagram or GenericDiagram") DiagramKind kind,
			@ToolParam(description = "Diagram title", required = false) String title,
			@ToolParam(description = "DBML source for SchemaDiagram, Mermaid source for GenericDiagram") String content,
			@ToolParam(
					description = "Required for SchemaDiagram: 'dbml', 'sql-postgres', 'sql-mysql', or 'sql-sqlserver'. Ignored for GenericDiagram.",
					required = false) String format) {
		String resolvedContent = resolveInboundContent(kind, content, format);
		String resolvedTitle = (title == null || title.isBlank()) ? DEFAULT_TITLE : title;
		return DiagramToolResult.from(diagramService.create(kind, resolvedTitle, resolvedContent));
	}

	@Tool(name = "update_diagram", description = "Partially update a Diagram; omit a field to leave it unchanged")
	public DiagramToolResult updateDiagram(
			@ToolParam(description = "Internal Diagram id") UUID id,
			@ToolParam(description = "New title", required = false) String title,
			@ToolParam(description = "New content", required = false) String content,
			@ToolParam(
					description = "Required when content is set for a SchemaDiagram: 'dbml', 'sql-postgres', 'sql-mysql', or 'sql-sqlserver'",
					required = false) String format) {
		String resolvedContent = content;
		if (content != null) {
			Diagram existing = diagramService.getById(id);
			resolvedContent = resolveInboundContent(existing.getKind(), content, format);
		}
		return DiagramToolResult.from(diagramService.update(id, title, resolvedContent, null));
	}

	@Tool(name = "export_diagram", description = "Export a Diagram's content as plain text")
	public String exportDiagram(
			@ToolParam(description = "Internal Diagram id") UUID id,
			@ToolParam(description = "dbml/sql-postgres/sql-mysql/sql-sqlserver for SchemaDiagram, "
					+ "mermaid for GenericDiagram") String format) {
		Diagram diagram = diagramService.getById(id);
		return switch (diagram.getKind()) {
			case SchemaDiagram -> exportSchemaDiagram(diagram, format);
			case GenericDiagram -> exportGenericDiagram(diagram, format);
		};
	}

	private String resolveInboundContent(DiagramKind kind, String content, String format) {
		if (kind != DiagramKind.SchemaDiagram) {
			return content;
		}
		if (format == null) {
			throw new IllegalArgumentException("format is required for SchemaDiagram");
		}
		if (format.equals("dbml")) {
			return content;
		}
		String dialect = SQL_FORMAT_DIALECTS.get(format);
		if (dialect == null) {
			throw new IllegalArgumentException("Unsupported format: " + format);
		}
		return dbmlConversionClient.sqlToDbml(content, dialect);
	}

	private String exportSchemaDiagram(Diagram diagram, String format) {
		if (format.equals("dbml")) {
			return diagram.getContent();
		}
		String dialect = SQL_FORMAT_DIALECTS.get(format);
		if (dialect == null) {
			throw new IllegalArgumentException("Unsupported format for SchemaDiagram: " + format);
		}
		return dbmlConversionClient.dbmlToSql(diagram.getContent(), dialect);
	}

	private String exportGenericDiagram(Diagram diagram, String format) {
		if (!"mermaid".equals(format)) {
			throw new IllegalArgumentException("Unsupported format for GenericDiagram: " + format);
		}
		return diagram.getContent();
	}

	public record DiagramToolResult(UUID id, String title, DiagramKind kind, String content, Instant updatedAt) {

		public static DiagramToolResult from(Diagram diagram) {
			return new DiagramToolResult(diagram.getId(), diagram.getTitle(), diagram.getKind(),
					diagram.getContent(), diagram.getUpdatedAt());
		}
	}

	public record DiagramToolSummary(UUID id, String title, DiagramKind kind, Instant updatedAt) {

		public static DiagramToolSummary from(Diagram diagram) {
			return new DiagramToolSummary(diagram.getId(), diagram.getTitle(), diagram.getKind(),
					diagram.getUpdatedAt());
		}
	}
}
