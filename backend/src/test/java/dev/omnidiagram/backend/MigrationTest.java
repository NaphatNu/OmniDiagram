package dev.omnidiagram.backend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

class MigrationTest extends AbstractIntegrationTest {

	@Autowired
	private JdbcTemplate jdbcTemplate;

	@Test
	void diagramsAndRevisionsTablesExist() {
		Integer diagramsCount = jdbcTemplate.queryForObject(
				"select count(*) from information_schema.tables where table_name = 'diagrams'",
				Integer.class);
		Integer revisionsCount = jdbcTemplate.queryForObject(
				"select count(*) from information_schema.tables where table_name = 'revisions'",
				Integer.class);

		assertThat(diagramsCount).isEqualTo(1);
		assertThat(revisionsCount).isEqualTo(1);
	}

	@Test
	void insertingDiagramWithMinimalColumnsPopulatesDefaults() {
		Map<String, Object> row = jdbcTemplate.queryForMap(
				"insert into diagrams (title, kind, content) values (?, ?, ?) "
						+ "returning id, share_token, created_at, updated_at",
				"Orders schema", "SchemaDiagram", "Table orders { id integer }");

		assertThat(row.get("id")).isNotNull();
		assertThat(row.get("share_token")).isNotNull();
		assertThat(row.get("created_at")).isNotNull();
		assertThat(row.get("updated_at")).isNotNull();
	}

	@Test
	void insertingDiagramWithInvalidKindViolatesCheckConstraint() {
		assertThatThrownBy(() -> jdbcTemplate.update(
				"insert into diagrams (title, kind, content) values (?, ?, ?)",
				"Bad kind", "Nonsense", "content"))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void deletingDiagramCascadesToRevisions() {
		UUID diagramId = jdbcTemplate.queryForObject(
				"insert into diagrams (title, kind, content) values (?, ?, ?) returning id",
				UUID.class, "To delete", "GenericDiagram", "flowchart TD");
		jdbcTemplate.update("insert into revisions (diagram_id, content) values (?, ?)",
				diagramId, "flowchart TD");

		jdbcTemplate.update("delete from diagrams where id = ?", diagramId);

		Integer remainingRevisions = jdbcTemplate.queryForObject(
				"select count(*) from revisions where diagram_id = ?", Integer.class, diagramId);
		assertThat(remainingRevisions).isZero();
	}

}
