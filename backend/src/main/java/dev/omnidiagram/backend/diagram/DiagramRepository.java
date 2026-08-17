package dev.omnidiagram.backend.diagram;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DiagramRepository extends JpaRepository<Diagram, UUID> {

	Optional<Diagram> findByShareToken(UUID shareToken);

	List<Diagram> findAllByOrderByUpdatedAtDesc();
}
