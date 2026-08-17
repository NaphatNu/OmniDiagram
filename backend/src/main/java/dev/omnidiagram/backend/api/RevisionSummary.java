package dev.omnidiagram.backend.api;

import dev.omnidiagram.backend.diagram.Revision;
import java.time.Instant;
import java.util.UUID;

public record RevisionSummary(UUID id, Instant createdAt, String contentPreview) {

	private static final int PREVIEW_LENGTH = 120;

	public static RevisionSummary from(Revision revision) {
		String content = revision.getContent();
		String preview = content.length() > PREVIEW_LENGTH ? content.substring(0, PREVIEW_LENGTH) : content;
		return new RevisionSummary(revision.getId(), revision.getCreatedAt(), preview);
	}
}
