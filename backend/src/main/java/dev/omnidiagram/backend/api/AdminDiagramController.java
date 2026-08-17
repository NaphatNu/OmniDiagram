package dev.omnidiagram.backend.api;

import dev.omnidiagram.backend.diagram.Diagram;
import dev.omnidiagram.backend.diagram.DiagramService;
import dev.omnidiagram.backend.diagram.StarterContent;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/diagrams")
public class AdminDiagramController {

	private static final String DEFAULT_TITLE = "Untitled diagram";

	private final DiagramService diagramService;

	public AdminDiagramController(DiagramService diagramService) {
		this.diagramService = diagramService;
	}

	@GetMapping
	public List<DiagramSummary> list() {
		return diagramService.listAll().stream().map(DiagramSummary::from).toList();
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public DiagramResponse create(@Valid @RequestBody CreateDiagramRequest request) {
		String title = (request.title() == null || request.title().isBlank()) ? DEFAULT_TITLE : request.title();
		Diagram diagram = diagramService.create(request.kind(), title, StarterContent.forKind(request.kind()));
		return DiagramResponse.from(diagram);
	}

	@DeleteMapping("/{shareToken}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@PathVariable UUID shareToken) {
		Diagram diagram = diagramService.getByShareToken(shareToken);
		diagramService.delete(diagram.getId());
	}
}
