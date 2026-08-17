package dev.omnidiagram.backend.api;

import dev.omnidiagram.backend.diagram.Diagram;
import dev.omnidiagram.backend.diagram.DiagramService;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/diagrams")
public class DiagramController {

	private final DiagramService diagramService;

	public DiagramController(DiagramService diagramService) {
		this.diagramService = diagramService;
	}

	@GetMapping("/{shareToken}")
	public DiagramResponse get(@PathVariable UUID shareToken) {
		return DiagramResponse.from(diagramService.getByShareToken(shareToken));
	}

	@PutMapping("/{shareToken}")
	public DiagramResponse update(@PathVariable UUID shareToken, @RequestBody UpdateDiagramRequest request) {
		Diagram diagram = diagramService.getByShareToken(shareToken);
		Diagram updated = diagramService.update(diagram.getId(), request.title(), request.content(),
				request.layout());
		return DiagramResponse.from(updated);
	}
}
