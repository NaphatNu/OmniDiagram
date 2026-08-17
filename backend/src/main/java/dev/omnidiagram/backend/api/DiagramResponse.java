package dev.omnidiagram.backend.api;

import dev.omnidiagram.backend.diagram.Diagram;
import dev.omnidiagram.backend.diagram.DiagramKind;
import dev.omnidiagram.backend.diagram.Position;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record DiagramResponse(
		UUID shareToken,
		String title,
		DiagramKind kind,
		String content,
		Map<String, Position> layout,
		Instant updatedAt) {

	public static DiagramResponse from(Diagram diagram) {
		return new DiagramResponse(diagram.getShareToken(), diagram.getTitle(), diagram.getKind(),
				diagram.getContent(), diagram.getLayout(), diagram.getUpdatedAt());
	}
}
