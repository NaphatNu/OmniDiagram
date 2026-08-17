package dev.omnidiagram.backend.diagram;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import dev.omnidiagram.backend.AbstractIntegrationTest;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

class DiagramServiceTest extends AbstractIntegrationTest {

	@Autowired
	private DiagramService diagramService;

	@Autowired
	private RevisionRepository revisionRepository;

	@Test
	void createPersistsAndReturnsDiagramWithGeneratedFields() {
		Diagram diagram = diagramService.create(DiagramKind.SchemaDiagram, "Orders schema",
				"Table orders { id integer }");

		assertThat(diagram.getId()).isNotNull();
		assertThat(diagram.getShareToken()).isNotNull();
		assertThat(diagram.getCreatedAt()).isNotNull();
		assertThat(diagram.getUpdatedAt()).isNotNull();
		assertThat(diagram.getLayout()).isEmpty();
	}

	@Test
	void createAppendsNoRevision() {
		Diagram diagram = diagramService.create(DiagramKind.GenericDiagram, "Flow", "flowchart TD");

		assertThat(revisionRepository.findAllByDiagramIdOrderByCreatedAtDesc(diagram.getId())).isEmpty();
	}

	@Test
	void getByShareTokenFindsTheCreatedDiagramAndThrowsForUnknownToken() {
		Diagram diagram = diagramService.create(DiagramKind.GenericDiagram, "Flow", "flowchart TD");

		Diagram found = diagramService.getByShareToken(diagram.getShareToken());

		assertThat(found.getId()).isEqualTo(diagram.getId());
		assertThatThrownBy(() -> diagramService.getByShareToken(UUID.randomUUID()))
				.isInstanceOf(DiagramNotFoundException.class);
	}

	@Test
	void getByIdFindsTheCreatedDiagramAndRejectsAShareToken() {
		Diagram diagram = diagramService.create(DiagramKind.GenericDiagram, "Flow", "flowchart TD");

		Diagram found = diagramService.getById(diagram.getId());

		assertThat(found.getId()).isEqualTo(diagram.getId());
		assertThatThrownBy(() -> diagramService.getById(diagram.getShareToken()))
				.isInstanceOf(DiagramNotFoundException.class);
	}

	@Test
	void updateWithNewContentAppendsOneRevisionHoldingThePreviousContentAndBumpsUpdatedAt() {
		Diagram diagram = diagramService.create(DiagramKind.GenericDiagram, "Flow", "flowchart TD");

		Diagram updated = diagramService.update(diagram.getId(), null, "flowchart LR", null);

		List<Revision> revisions = revisionRepository.findAllByDiagramIdOrderByCreatedAtDesc(diagram.getId());
		assertThat(revisions).hasSize(1);
		assertThat(revisions.get(0).getContent()).isEqualTo("flowchart TD");
		assertThat(updated.getContent()).isEqualTo("flowchart LR");
		assertThat(updated.getUpdatedAt()).isAfterOrEqualTo(diagram.getUpdatedAt());
	}

	@Test
	void updateWithOnlyATitleAppendsNoRevision() {
		Diagram diagram = diagramService.create(DiagramKind.GenericDiagram, "Flow", "flowchart TD");

		Diagram updated = diagramService.update(diagram.getId(), "Renamed", null, null);

		assertThat(updated.getTitle()).isEqualTo("Renamed");
		assertThat(revisionRepository.findAllByDiagramIdOrderByCreatedAtDesc(diagram.getId())).isEmpty();
	}

	@Test
	void updateWithNullContentLeavesContentUnchanged() {
		Diagram diagram = diagramService.create(DiagramKind.GenericDiagram, "Flow", "flowchart TD");

		Diagram updated = diagramService.update(diagram.getId(), "Renamed", null, null);

		assertThat(updated.getContent()).isEqualTo("flowchart TD");
	}

	@Test
	void twoSequentialUpdatesBothSucceedAndTheSecondValueWins() {
		Diagram diagram = diagramService.create(DiagramKind.GenericDiagram, "Flow", "flowchart TD");

		diagramService.update(diagram.getId(), null, "flowchart LR", null);
		Diagram second = diagramService.update(diagram.getId(), null, "flowchart RL", null);

		assertThat(second.getContent()).isEqualTo("flowchart RL");
	}

	@Test
	void updatePersistsLayoutAndReadsItBackWithNestedXAndYIntact() {
		Diagram diagram = diagramService.create(DiagramKind.SchemaDiagram, "Orders schema",
				"Table orders { id integer }");

		Diagram updated = diagramService.update(diagram.getId(), null, null,
				Map.of("orders", new Position(10, 20)));

		assertThat(updated.getLayout().get("orders")).isEqualTo(new Position(10, 20));

		Diagram reloaded = diagramService.getById(diagram.getId());
		assertThat(reloaded.getLayout().get("orders")).isEqualTo(new Position(10, 20));
	}

	@Test
	void deleteRemovesTheDiagramAndCascadesItsRevisions() {
		Diagram diagram = diagramService.create(DiagramKind.GenericDiagram, "Flow", "flowchart TD");
		diagramService.update(diagram.getId(), null, "flowchart LR", null);

		diagramService.delete(diagram.getId());

		assertThatThrownBy(() -> diagramService.getById(diagram.getId()))
				.isInstanceOf(DiagramNotFoundException.class);
		assertThat(revisionRepository.findAllByDiagramIdOrderByCreatedAtDesc(diagram.getId())).isEmpty();
	}

	@Test
	void listAllOrdersByUpdatedAtDescending() {
		Diagram first = diagramService.create(DiagramKind.GenericDiagram, "First", "flowchart TD");
		Diagram second = diagramService.create(DiagramKind.GenericDiagram, "Second", "flowchart TD");
		diagramService.update(first.getId(), null, "flowchart LR", null);

		List<Diagram> all = diagramService.listAll();

		int firstIndex = indexOf(all, first.getId());
		int secondIndex = indexOf(all, second.getId());
		assertThat(firstIndex).isLessThan(secondIndex);
	}

	private static int indexOf(List<Diagram> diagrams, UUID id) {
		for (int i = 0; i < diagrams.size(); i++) {
			if (diagrams.get(i).getId().equals(id)) {
				return i;
			}
		}
		throw new AssertionError("Diagram not found in list: " + id);
	}
}
