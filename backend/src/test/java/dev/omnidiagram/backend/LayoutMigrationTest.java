package dev.omnidiagram.backend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

class LayoutMigrationTest extends AbstractIntegrationTest {

	@Autowired
	private JdbcTemplate jdbcTemplate;

	@Test
	void layoutColumnExistsOnBothTablesAndDefaultsToEmptyObject() {
		Map<String, Object> diagramRow = jdbcTemplate.queryForMap(
				"insert into diagrams (title, kind, content) values (?, ?, ?) returning layout",
				"Orders schema", "SchemaDiagram", "Table orders { id integer }");
		assertThat(diagramRow.get("layout").toString()).isEqualTo("{}");

		String diagramId = jdbcTemplate.queryForObject(
				"insert into diagrams (title, kind, content) values (?, ?, ?) returning id",
				String.class, "For revision", "GenericDiagram", "flowchart TD");
		Map<String, Object> revisionRow = jdbcTemplate.queryForMap(
				"insert into revisions (diagram_id, content) values (?::uuid, ?) returning layout",
				diagramId, "flowchart TD");
		assertThat(revisionRow.get("layout").toString()).isEqualTo("{}");
	}

	@Test
	void layoutColumnRoundTripsARealPayload() {
		Map<String, Object> row = jdbcTemplate.queryForMap(
				"insert into diagrams (title, kind, content, layout) values (?, ?, ?, ?::jsonb) "
						+ "returning layout #>> '{orders,x}' as x, layout #>> '{orders,y}' as y",
				"Orders schema", "SchemaDiagram", "Table orders { id integer }",
				"{\"orders\": {\"x\": 10, \"y\": 20}}");

		assertThat(row.get("x")).isEqualTo("10");
		assertThat(row.get("y")).isEqualTo("20");
	}

	@Test
	void layoutColumnRejectsInvalidJson() {
		assertThatThrownBy(() -> jdbcTemplate.update(
				"insert into diagrams (title, kind, content, layout) values (?, ?, ?, ?::jsonb)",
				"Bad layout", "SchemaDiagram", "Table orders { id integer }", "not json"))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

}
