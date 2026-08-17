package dev.omnidiagram.backend.api;

import dev.omnidiagram.backend.diagram.Diagram;
import dev.omnidiagram.backend.diagram.DiagramKind;
import java.time.Instant;
import java.util.UUID;

public record DiagramSummary(UUID shareToken, String title, DiagramKind kind, Instant updatedAt) {

	public static DiagramSummary from(Diagram diagram) {
		return new DiagramSummary(diagram.getShareToken(), diagram.getTitle(), diagram.getKind(),
				diagram.getUpdatedAt());
	}
}
