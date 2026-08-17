package dev.omnidiagram.backend.api;

import dev.omnidiagram.backend.diagram.Position;
import java.util.Map;

public record UpdateDiagramRequest(String title, String content, Map<String, Position> layout) {
}
