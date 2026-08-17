package dev.omnidiagram.backend.diagram;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "diagrams")
@Getter
@Setter
@NoArgsConstructor
public class Diagram {

	@Id
	@Column(insertable = false, updatable = false)
	@Generated(event = EventType.INSERT)
	private UUID id;

	@Column(name = "share_token", insertable = false, updatable = false)
	@Generated(event = EventType.INSERT)
	private UUID shareToken;

	private String title;

	@Enumerated(EnumType.STRING)
	private DiagramKind kind;

	private String content;

	@JdbcTypeCode(SqlTypes.JSON)
	private Map<String, Position> layout = new LinkedHashMap<>();

	@Column(name = "created_at", insertable = false, updatable = false)
	@Generated(event = EventType.INSERT)
	private Instant createdAt;

	@Column(name = "updated_at", insertable = false)
	@Generated(event = EventType.INSERT)
	private Instant updatedAt;

	public Diagram(DiagramKind kind, String title, String content) {
		this.kind = kind;
		this.title = title;
		this.content = content;
	}
}
