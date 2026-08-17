package dev.omnidiagram.backend.mcp;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import dev.omnidiagram.backend.AbstractIntegrationTest;
import dev.omnidiagram.backend.diagram.Diagram;
import dev.omnidiagram.backend.diagram.DiagramKind;
import dev.omnidiagram.backend.diagram.DiagramService;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.beans.factory.annotation.Autowired;

class DiagramToolsTest extends AbstractIntegrationTest {

	@Autowired
	private DiagramTools diagramTools;

	@Autowired
	private DiagramService diagramService;

	@Autowired
	private ToolCallbackProvider toolCallbackProvider;

	@Test
	void listDiagramsReturnsEveryDiagramWithItsId() {
		Diagram diagram = diagramService.create(DiagramKind.GenericDiagram, "Flow", "flowchart TD");

		List<DiagramTools.DiagramToolSummary> summaries = diagramTools.listDiagrams();

		assertThat(summaries).extracting(DiagramTools.DiagramToolSummary::id).contains(diagram.getId());
	}

	@Test
	void getDiagramByIdReturnsContentAndUnknownIdIsACleanError() {
		Diagram diagram = diagramService.create(DiagramKind.GenericDiagram, "Flow", "flowchart TD");

		DiagramTools.DiagramToolResult result = diagramTools.getDiagram(diagram.getId());
		assertThat(result.content()).isEqualTo("flowchart TD");

		assertThatThrownBy(() -> diagramTools.getDiagram(UUID.randomUUID()))
				.isInstanceOf(RuntimeException.class)
				.hasMessageContaining("not found");
	}

	@Test
	void getDiagramGivenAShareTokenInsteadOfAnIdFails() {
		Diagram diagram = diagramService.create(DiagramKind.GenericDiagram, "Flow", "flowchart TD");

		assertThatThrownBy(() -> diagramTools.getDiagram(diagram.getShareToken()))
				.isInstanceOf(RuntimeException.class);
	}

	@Test
	void createDiagramWithGenericDiagramKindPersistsMermaidContentAndReturnsTheNewId() {
		DiagramTools.DiagramToolResult result = diagramTools.createDiagram(DiagramKind.GenericDiagram, "Flow",
				"flowchart TD", null);

		assertThat(result.id()).isNotNull();
		Diagram reloaded = diagramService.getById(result.id());
		assertThat(reloaded.getContent()).isEqualTo("flowchart TD");
	}

	@Test
	void updateDiagramWithOnlyTitleLeavesContentUnchanged() {
		Diagram diagram = diagramService.create(DiagramKind.GenericDiagram, "Flow", "flowchart TD");

		DiagramTools.DiagramToolResult result = diagramTools.updateDiagram(diagram.getId(), "Renamed", null, null);

		assertThat(result.title()).isEqualTo("Renamed");
		assertThat(result.content()).isEqualTo("flowchart TD");
	}

	@Test
	void updateDiagramTwiceInARowBothSucceedLastWriteWinsAndTwoRevisionsExist() {
		Diagram diagram = diagramService.create(DiagramKind.GenericDiagram, "Flow", "flowchart TD");

		diagramTools.updateDiagram(diagram.getId(), null, "flowchart LR", null);
		DiagramTools.DiagramToolResult second = diagramTools.updateDiagram(diagram.getId(), null, "flowchart RL",
				null);

		assertThat(second.content()).isEqualTo("flowchart RL");
		assertThat(diagramService.listRevisions(diagram.getId())).hasSize(2);
	}

	@Test
	void exportDiagramDbmlReturnsTheStoredDbmlVerbatim() {
		Diagram diagram = diagramService.create(DiagramKind.SchemaDiagram, "Orders schema",
				"Table orders { id integer }");

		String exported = diagramTools.exportDiagram(diagram.getId(), "dbml");

		assertThat(exported).isEqualTo("Table orders { id integer }");
	}

	@Test
	void exportDiagramMermaidOnAGenericDiagramReturnsItsSource() {
		Diagram diagram = diagramService.create(DiagramKind.GenericDiagram, "Flow", "flowchart TD");

		String exported = diagramTools.exportDiagram(diagram.getId(), "mermaid");

		assertThat(exported).isEqualTo("flowchart TD");
	}

	@Test
	void exportDiagramPngAndSvgAreRejectedAsUnsupportedFormats() {
		Diagram diagram = diagramService.create(DiagramKind.SchemaDiagram, "Orders schema",
				"Table orders { id integer }");

		assertThatThrownBy(() -> diagramTools.exportDiagram(diagram.getId(), "png"))
				.isInstanceOf(IllegalArgumentException.class);
		assertThatThrownBy(() -> diagramTools.exportDiagram(diagram.getId(), "svg"))
				.isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	void exportDiagramWithAFormatThatDoesNotMatchTheDiagramsKindIsRejected() {
		Diagram schemaDiagram = diagramService.create(DiagramKind.SchemaDiagram, "Orders schema",
				"Table orders { id integer }");
		Diagram genericDiagram = diagramService.create(DiagramKind.GenericDiagram, "Flow", "flowchart TD");

		assertThatThrownBy(() -> diagramTools.exportDiagram(schemaDiagram.getId(), "mermaid"))
				.isInstanceOf(IllegalArgumentException.class);
		assertThatThrownBy(() -> diagramTools.exportDiagram(genericDiagram.getId(), "dbml"))
				.isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	void noDeleteToolIsRegistered() {
		List<String> toolNames = Arrays.stream(toolCallbackProvider.getToolCallbacks())
				.map(callback -> callback.getToolDefinition().name())
				.toList();

		assertThat(toolNames).containsExactlyInAnyOrder("list_diagrams", "get_diagram", "create_diagram",
				"update_diagram", "export_diagram");
	}
}
