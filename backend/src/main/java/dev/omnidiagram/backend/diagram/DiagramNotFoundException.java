package dev.omnidiagram.backend.diagram;

import java.util.UUID;

public class DiagramNotFoundException extends RuntimeException {

	public DiagramNotFoundException(UUID id) {
		super("Diagram not found: " + id);
	}
}
