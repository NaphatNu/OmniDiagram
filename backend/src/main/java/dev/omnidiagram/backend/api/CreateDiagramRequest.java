package dev.omnidiagram.backend.api;

import dev.omnidiagram.backend.diagram.DiagramKind;
import jakarta.validation.constraints.NotNull;

public record CreateDiagramRequest(@NotNull DiagramKind kind, String title) {
}
