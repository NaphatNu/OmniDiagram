package dev.omnidiagram.backend.api;

import dev.omnidiagram.backend.AbstractIntegrationTest;
import dev.omnidiagram.backend.diagram.Diagram;
import dev.omnidiagram.backend.diagram.DiagramKind;
import dev.omnidiagram.backend.diagram.DiagramService;
import dev.omnidiagram.backend.diagram.Revision;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.result.MockMvcResultMatchers;

@AutoConfigureMockMvc
class RevisionControllerTest extends AbstractIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private DiagramService diagramService;

	@Test
	void getOnADiagramWithThreeSavesReturnsThreeEntriesNewestFirst() throws Exception {
		Diagram diagram = diagramService.create(DiagramKind.GenericDiagram, "Flow", "flowchart TD");
		diagramService.update(diagram.getId(), null, "flowchart LR", null);
		diagramService.update(diagram.getId(), null, "flowchart RL", null);
		diagramService.update(diagram.getId(), null, "flowchart BT", null);

		mockMvc.perform(MockMvcRequestBuilders.get("/api/diagrams/{shareToken}/revisions", diagram.getShareToken()))
				.andExpect(MockMvcResultMatchers.status().isOk())
				.andExpect(MockMvcResultMatchers.jsonPath("$.length()").value(3))
				.andExpect(MockMvcResultMatchers.jsonPath("$[0].contentPreview").value("flowchart RL"))
				.andExpect(MockMvcResultMatchers.jsonPath("$[2].contentPreview").value("flowchart TD"));
	}

	@Test
	void getOnANeverEditedDiagramReturnsEmptyArray() throws Exception {
		Diagram diagram = diagramService.create(DiagramKind.GenericDiagram, "Flow", "flowchart TD");

		mockMvc.perform(MockMvcRequestBuilders.get("/api/diagrams/{shareToken}/revisions", diagram.getShareToken()))
				.andExpect(MockMvcResultMatchers.status().isOk())
				.andExpect(MockMvcResultMatchers.jsonPath("$").isArray())
				.andExpect(MockMvcResultMatchers.jsonPath("$").isEmpty());
	}

	@Test
	void postRevertReturns200WithTheRestoredContentInTheBody() throws Exception {
		Diagram diagram = diagramService.create(DiagramKind.GenericDiagram, "Flow", "flowchart TD");
		diagramService.update(diagram.getId(), null, "flowchart LR", null);
		Revision original = diagramService.listRevisions(diagram.getId()).get(0);

		mockMvc.perform(MockMvcRequestBuilders.post("/api/diagrams/{shareToken}/revisions/{id}/revert",
						diagram.getShareToken(), original.getId()))
				.andExpect(MockMvcResultMatchers.status().isOk())
				.andExpect(MockMvcResultMatchers.jsonPath("$.content").value("flowchart TD"));
	}

	@Test
	void postWithAnUnknownRevisionIdReturns404() throws Exception {
		Diagram diagram = diagramService.create(DiagramKind.GenericDiagram, "Flow", "flowchart TD");

		mockMvc.perform(MockMvcRequestBuilders.post("/api/diagrams/{shareToken}/revisions/{id}/revert",
						diagram.getShareToken(), UUID.randomUUID()))
				.andExpect(MockMvcResultMatchers.status().isNotFound());
	}

	@Test
	void postUsingAnotherDiagramsRevisionIdReturns404() throws Exception {
		Diagram diagram = diagramService.create(DiagramKind.GenericDiagram, "Flow", "flowchart TD");
		Diagram other = diagramService.create(DiagramKind.GenericDiagram, "Other", "flowchart LR");
		diagramService.update(other.getId(), null, "flowchart RL", null);
		Revision otherRevision = diagramService.listRevisions(other.getId()).get(0);

		mockMvc.perform(MockMvcRequestBuilders.post("/api/diagrams/{shareToken}/revisions/{id}/revert",
						diagram.getShareToken(), otherRevision.getId()))
				.andExpect(MockMvcResultMatchers.status().isNotFound());
	}

	@Test
	void unknownShareTokenReturns404OnBothRoutes() throws Exception {
		UUID unknownToken = UUID.randomUUID();

		mockMvc.perform(MockMvcRequestBuilders.get("/api/diagrams/{shareToken}/revisions", unknownToken))
				.andExpect(MockMvcResultMatchers.status().isNotFound());

		mockMvc.perform(MockMvcRequestBuilders.post("/api/diagrams/{shareToken}/revisions/{id}/revert",
						unknownToken, UUID.randomUUID()))
				.andExpect(MockMvcResultMatchers.status().isNotFound());
	}
}
