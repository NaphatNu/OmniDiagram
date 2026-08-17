package dev.omnidiagram.backend.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;

import dev.omnidiagram.backend.AbstractIntegrationTest;
import dev.omnidiagram.backend.diagram.Diagram;
import dev.omnidiagram.backend.diagram.DiagramKind;
import dev.omnidiagram.backend.diagram.DiagramService;
import dev.omnidiagram.backend.diagram.Position;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.result.MockMvcResultMatchers;
import tools.jackson.databind.ObjectMapper;

@AutoConfigureMockMvc
class DiagramControllerTest extends AbstractIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private DiagramService diagramService;

	@Autowired
	private ObjectMapper objectMapper;

	@Test
	void getWithARealShareTokenReturns200AndTheExpectedJson() throws Exception {
		Diagram diagram = diagramService.create(DiagramKind.SchemaDiagram, "Orders schema",
				"Table orders { id integer }");

		mockMvc.perform(MockMvcRequestBuilders.get("/api/diagrams/{shareToken}", diagram.getShareToken()))
				.andExpect(MockMvcResultMatchers.status().isOk())
				.andExpect(MockMvcResultMatchers.jsonPath("$.shareToken").value(diagram.getShareToken().toString()))
				.andExpect(MockMvcResultMatchers.jsonPath("$.title").value("Orders schema"))
				.andExpect(MockMvcResultMatchers.jsonPath("$.kind").value("SchemaDiagram"))
				.andExpect(MockMvcResultMatchers.jsonPath("$.content").value("Table orders { id integer }"));
	}

	@Test
	void getResponseBodyHasNoIdField() throws Exception {
		Diagram diagram = diagramService.create(DiagramKind.GenericDiagram, "Flow", "flowchart TD");

		mockMvc.perform(MockMvcRequestBuilders.get("/api/diagrams/{shareToken}", diagram.getShareToken()))
				.andExpect(MockMvcResultMatchers.jsonPath("$.id").doesNotExist());
	}

	@Test
	void getWithAnUnknownTokenReturns404NotAServerError() throws Exception {
		mockMvc.perform(MockMvcRequestBuilders.get("/api/diagrams/{shareToken}", UUID.randomUUID()))
				.andExpect(MockMvcResultMatchers.status().isNotFound())
				.andExpect(MockMvcResultMatchers.content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON));
	}

	@Test
	void getWithAMalformedTokenReturns400OrNotFoundNeverAServerError() throws Exception {
		mockMvc.perform(MockMvcRequestBuilders.get("/api/diagrams/{shareToken}", "not-a-uuid"))
				.andExpect(MockMvcResultMatchers.status().is4xxClientError())
				.andExpect(MockMvcResultMatchers.content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON));
	}

	@Test
	void getUsingTheInternalIdInPlaceOfTheTokenReturns404() throws Exception {
		Diagram diagram = diagramService.create(DiagramKind.GenericDiagram, "Flow", "flowchart TD");

		mockMvc.perform(MockMvcRequestBuilders.get("/api/diagrams/{shareToken}", diagram.getId()))
				.andExpect(MockMvcResultMatchers.status().isNotFound());
	}

	@Test
	void putWithNewContentReturns200PersistsAndAppendsARevision() throws Exception {
		Diagram diagram = diagramService.create(DiagramKind.GenericDiagram, "Flow", "flowchart TD");

		mockMvc.perform(MockMvcRequestBuilders.put("/api/diagrams/{shareToken}", diagram.getShareToken())
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(
								new UpdateDiagramRequest(null, "flowchart LR", null))))
				.andExpect(MockMvcResultMatchers.status().isOk())
				.andExpect(MockMvcResultMatchers.jsonPath("$.content").value("flowchart LR"));

		Diagram reloaded = diagramService.getById(diagram.getId());
		assertThat(reloaded.getContent()).isEqualTo("flowchart LR");
	}

	@Test
	void putWithOnlyTitleChangesTitleAndLeavesContentUntouched() throws Exception {
		Diagram diagram = diagramService.create(DiagramKind.GenericDiagram, "Flow", "flowchart TD");

		mockMvc.perform(MockMvcRequestBuilders.put("/api/diagrams/{shareToken}", diagram.getShareToken())
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(
								new UpdateDiagramRequest("Renamed", null, null))))
				.andExpect(MockMvcResultMatchers.status().isOk())
				.andExpect(MockMvcResultMatchers.jsonPath("$.title").value("Renamed"))
				.andExpect(MockMvcResultMatchers.jsonPath("$.content").value("flowchart TD"));
	}

	@Test
	void putWithAnEmptyBodyIsANoOpReturning200() throws Exception {
		Diagram diagram = diagramService.create(DiagramKind.GenericDiagram, "Flow", "flowchart TD");

		mockMvc.perform(MockMvcRequestBuilders.put("/api/diagrams/{shareToken}", diagram.getShareToken())
						.contentType(MediaType.APPLICATION_JSON)
						.content("{}"))
				.andExpect(MockMvcResultMatchers.status().isOk())
				.andExpect(MockMvcResultMatchers.jsonPath("$.title").value("Flow"))
				.andExpect(MockMvcResultMatchers.jsonPath("$.content").value("flowchart TD"));
	}

	@Test
	void putTwiceInARowBothReturn200WithTheLastValueWinning() throws Exception {
		Diagram diagram = diagramService.create(DiagramKind.GenericDiagram, "Flow", "flowchart TD");

		mockMvc.perform(MockMvcRequestBuilders.put("/api/diagrams/{shareToken}", diagram.getShareToken())
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(
								new UpdateDiagramRequest(null, "flowchart LR", null))))
				.andExpect(MockMvcResultMatchers.status().isOk());

		mockMvc.perform(MockMvcRequestBuilders.put("/api/diagrams/{shareToken}", diagram.getShareToken())
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(
								new UpdateDiagramRequest(null, "flowchart RL", null))))
				.andExpect(MockMvcResultMatchers.status().isOk())
				.andExpect(MockMvcResultMatchers.jsonPath("$.content").value("flowchart RL"));
	}

	@Test
	void putWithALayoutPayloadRoundTripsIt() throws Exception {
		Diagram diagram = diagramService.create(DiagramKind.SchemaDiagram, "Orders schema",
				"Table orders { id integer }");

		mockMvc.perform(MockMvcRequestBuilders.put("/api/diagrams/{shareToken}", diagram.getShareToken())
						.contentType(MediaType.APPLICATION_JSON)
						.content(objectMapper.writeValueAsString(
								new UpdateDiagramRequest(null, null, Map.of("orders", new Position(10, 20))))))
				.andExpect(MockMvcResultMatchers.status().isOk())
				.andExpect(MockMvcResultMatchers.jsonPath("$.layout.orders.x").value(equalTo(10.0)))
				.andExpect(MockMvcResultMatchers.jsonPath("$.layout.orders.y").value(equalTo(20.0)));
	}
}
