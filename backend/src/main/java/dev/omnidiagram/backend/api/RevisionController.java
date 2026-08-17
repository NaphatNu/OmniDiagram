package dev.omnidiagram.backend.api;

import dev.omnidiagram.backend.diagram.Diagram;
import dev.omnidiagram.backend.diagram.DiagramService;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/diagrams/{shareToken}/revisions")
public class RevisionController {

	private final DiagramService diagramService;

	public RevisionController(DiagramService diagramService) {
		this.diagramService = diagramService;
	}

	@GetMapping
	public List<RevisionSummary> list(@PathVariable UUID shareToken) {
		Diagram diagram = diagramService.getByShareToken(shareToken);
		return diagramService.listRevisions(diagram.getId()).stream().map(RevisionSummary::from).toList();
	}

	@PostMapping("/{id}/revert")
	public DiagramResponse revert(@PathVariable UUID shareToken, @PathVariable UUID id) {
		Diagram diagram = diagramService.getByShareToken(shareToken);
		Diagram reverted = diagramService.revertTo(diagram.getId(), id);
		return DiagramResponse.from(reverted);
	}
}
