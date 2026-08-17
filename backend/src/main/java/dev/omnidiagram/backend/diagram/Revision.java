package dev.omnidiagram.backend.diagram;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Generated;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.generator.EventType;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "revisions")
@Getter
@Setter
@NoArgsConstructor
public class Revision {

	@Id
	@Column(insertable = false, updatable = false)
	@Generated(event = EventType.INSERT)
	private UUID id;

	@Column(name = "diagram_id", updatable = false)
	private UUID diagramId;

	private String content;

	@JdbcTypeCode(SqlTypes.JSON)
	private Map<String, Position> layout = new LinkedHashMap<>();

	@Column(name = "created_at", insertable = false, updatable = false)
	@Generated(event = EventType.INSERT)
	private Instant createdAt;

	public Revision(UUID diagramId, String content, Map<String, Position> layout) {
		this.diagramId = diagramId;
		this.content = content;
		this.layout = layout != null ? layout : new LinkedHashMap<>();
	}
}
