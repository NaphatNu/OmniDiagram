package dev.omnidiagram.backend.diagram;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class DiagramService {

	private final DiagramRepository diagramRepository;
	private final RevisionRepository revisionRepository;

	public DiagramService(DiagramRepository diagramRepository, RevisionRepository revisionRepository) {
		this.diagramRepository = diagramRepository;
		this.revisionRepository = revisionRepository;
	}

	@Transactional(readOnly = true)
	public List<Diagram> listAll() {
		return diagramRepository.findAllByOrderByUpdatedAtDesc();
	}

	@Transactional(readOnly = true)
	public Diagram getById(UUID id) {
		return findDiagram(id);
	}

	@Transactional(readOnly = true)
	public Diagram getByShareToken(UUID shareToken) {
		return diagramRepository.findByShareToken(shareToken)
				.orElseThrow(() -> new DiagramNotFoundException(shareToken));
	}

	public Diagram create(DiagramKind kind, String title, String content) {
		return diagramRepository.save(new Diagram(kind, title, content));
	}

	public Diagram update(UUID id, String title, String content, Map<String, Position> layout) {
		Diagram diagram = findDiagram(id);

		if (content != null || layout != null) {
			revisionRepository.save(new Revision(diagram.getId(), diagram.getContent(), diagram.getLayout()));
		}
		if (title != null) {
			diagram.setTitle(title);
		}
		if (content != null) {
			diagram.setContent(content);
		}
		if (layout != null) {
			diagram.setLayout(layout);
		}
		diagram.setUpdatedAt(Instant.now());

		return diagramRepository.save(diagram);
	}

	public void delete(UUID id) {
		diagramRepository.deleteById(id);
	}

	private Diagram findDiagram(UUID id) {
		return diagramRepository.findById(id).orElseThrow(() -> new DiagramNotFoundException(id));
	}
}
