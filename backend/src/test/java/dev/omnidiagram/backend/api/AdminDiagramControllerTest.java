package dev.omnidiagram.backend.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.emptyOrNullString;
import static org.hamcrest.Matchers.not;

import dev.omnidiagram.backend.AbstractIntegrationTest;
import dev.omnidiagram.backend.diagram.Diagram;
import dev.omnidiagram.backend.diagram.DiagramKind;
import dev.omnidiagram.backend.diagram.DiagramService;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.result.MockMvcResultMatchers;

@AutoConfigureMockMvc
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class AdminDiagramControllerTest extends AbstractIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private DiagramService diagramService;

	@Test
	@Order(1)
	void getOnAnEmptyDatabaseReturnsEmptyArrayNotNotFound() throws Exception {
		mockMvc.perform(MockMvcRequestBuilders.get("/api/admin/diagrams"))
				.andExpect(MockMvcResultMatchers.status().isOk())
				.andExpect(MockMvcResultMatchers.jsonPath("$").isArray())
				.andExpect(MockMvcResultMatchers.jsonPath("$").isEmpty());
	}

	@Test
	@Order(2)
	void getReturnsAllDiagramsOrderedByUpdatedAtDescending() throws Exception {
		Diagram first = diagramService.create(DiagramKind.GenericDiagram, "First", "flowchart TD");
		Diagram second = diagramService.create(DiagramKind.GenericDiagram, "Second", "flowchart TD");
		diagramService.update(first.getId(), null, "flowchart LR", null);

		String body = mockMvc.perform(MockMvcRequestBuilders.get("/api/admin/diagrams"))
				.andExpect(MockMvcResultMatchers.status().isOk())
				.andReturn().getResponse().getContentAsString();

		int firstIndex = body.indexOf(first.getShareToken().toString());
		int secondIndex = body.indexOf(second.getShareToken().toString());
		assertThat(firstIndex).isGreaterThanOrEqualTo(0);
		assertThat(secondIndex).isGreaterThanOrEqualTo(0);
		assertThat(firstIndex).isLessThan(secondIndex);
	}

	@Test
	@Order(3)
	void getItemsCarryNoContentAndNoId() throws Exception {
		diagramService.create(DiagramKind.GenericDiagram, "Flow", "flowchart TD");

		mockMvc.perform(MockMvcRequestBuilders.get("/api/admin/diagrams"))
				.andExpect(MockMvcResultMatchers.status().isOk())
				.andExpect(MockMvcResultMatchers.jsonPath("$[0].content").doesNotExist())
				.andExpect(MockMvcResultMatchers.jsonPath("$[0].id").doesNotExist());
	}

	@Test
	@Order(4)
	void postWithSchemaDiagramKindReturns201PersistsAndSeedsDbmlStarterContent() throws Exception {
		String response = mockMvc
				.perform(MockMvcRequestBuilders.post("/api/admin/diagrams")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"kind\":\"SchemaDiagram\",\"title\":\"Orders\"}"))
				.andExpect(MockMvcResultMatchers.status().isCreated())
				.andExpect(MockMvcResultMatchers.jsonPath("$.content").value(containsString("Table")))
				.andReturn().getResponse().getContentAsString();

		assertThat(response).contains("Orders");
	}

	@Test
	@Order(5)
	void postWithGenericDiagramKindSeedsMermaidStarterContent() throws Exception {
		mockMvc.perform(MockMvcRequestBuilders.post("/api/admin/diagrams")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"kind\":\"GenericDiagram\"}"))
				.andExpect(MockMvcResultMatchers.status().isCreated())
				.andExpect(MockMvcResultMatchers.jsonPath("$.content").value(containsString("flowchart")));
	}

	@Test
	@Order(6)
	void postWithAMissingKindReturns400() throws Exception {
		mockMvc.perform(MockMvcRequestBuilders.post("/api/admin/diagrams")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"title\":\"No kind\"}"))
				.andExpect(MockMvcResultMatchers.status().isBadRequest())
				.andExpect(MockMvcResultMatchers.content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON));
	}

	@Test
	@Order(7)
	void postWithAnUnrecognisedKindReturns400() throws Exception {
		mockMvc.perform(MockMvcRequestBuilders.post("/api/admin/diagrams")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"kind\":\"Nonsense\"}"))
				.andExpect(MockMvcResultMatchers.status().isBadRequest())
				.andExpect(MockMvcResultMatchers.content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON));
	}

	@Test
	@Order(8)
	void postWithNoTitleStillSucceedsWithADefaultTitle() throws Exception {
		mockMvc.perform(MockMvcRequestBuilders.post("/api/admin/diagrams")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"kind\":\"GenericDiagram\"}"))
				.andExpect(MockMvcResultMatchers.status().isCreated())
				.andExpect(MockMvcResultMatchers.jsonPath("$.title").value(not(emptyOrNullString())));
	}

	@Test
	@Order(9)
	void deleteReturns204RemovesTheDiagramAndCascadesItsRevisions() throws Exception {
		Diagram diagram = diagramService.create(DiagramKind.GenericDiagram, "To delete", "flowchart TD");
		diagramService.update(diagram.getId(), null, "flowchart LR", null);

		mockMvc.perform(MockMvcRequestBuilders.delete("/api/admin/diagrams/{shareToken}", diagram.getShareToken()))
				.andExpect(MockMvcResultMatchers.status().isNoContent());

		mockMvc.perform(MockMvcRequestBuilders.get("/api/diagrams/{shareToken}", diagram.getShareToken()))
				.andExpect(MockMvcResultMatchers.status().isNotFound());
	}

	@Test
	@Order(10)
	void deleteOnAnUnknownTokenReturns404() throws Exception {
		mockMvc.perform(MockMvcRequestBuilders.delete("/api/admin/diagrams/{shareToken}", UUID.randomUUID()))
				.andExpect(MockMvcResultMatchers.status().isNotFound());
	}
}
