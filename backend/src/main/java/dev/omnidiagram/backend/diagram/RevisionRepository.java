package dev.omnidiagram.backend.diagram;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RevisionRepository extends JpaRepository<Revision, UUID> {

	List<Revision> findAllByDiagramIdOrderByCreatedAtDesc(UUID diagramId);
}
