package dev.omnidiagram.backend.conversion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withBadRequest;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.io.IOException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class DbmlConversionClientTest {

	private static final String FRONTEND_URL = "http://frontend:3000";

	private final RestClient.Builder builder = RestClient.builder();
	private final MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
	private final DbmlConversionClient client = new DbmlConversionClient(builder, FRONTEND_URL);

	@Test
	void sqlToDbmlPostsToTheRightPathWithTheRightBodyAndReturnsTheDbmlField() {
		server.expect(requestTo(FRONTEND_URL + "/api/internal/dbml/from-sql"))
			.andExpect(method(HttpMethod.POST))
			.andExpect(jsonPath("$.sql").value("CREATE TABLE users (id INT);"))
			.andExpect(jsonPath("$.dialect").value("postgres"))
			.andRespond(withSuccess("{\"dbml\":\"Table users {}\"}", MediaType.APPLICATION_JSON));

		String dbml = client.sqlToDbml("CREATE TABLE users (id INT);", "postgres");

		assertThat(dbml).isEqualTo("Table users {}");
		server.verify();
	}

	@Test
	void dbmlToSqlPostsToTheRightPathWithTheRightBodyForPostgres() {
		assertDbmlToSqlUsesDialect("postgres");
	}

	@Test
	void dbmlToSqlPostsToTheRightPathWithTheRightBodyForMysql() {
		assertDbmlToSqlUsesDialect("mysql");
	}

	@Test
	void dbmlToSqlPostsToTheRightPathWithTheRightBodyForMssql() {
		assertDbmlToSqlUsesDialect("mssql");
	}

	private void assertDbmlToSqlUsesDialect(String dialect) {
		server.expect(requestTo(FRONTEND_URL + "/api/internal/dbml/to-sql"))
			.andExpect(method(HttpMethod.POST))
			.andExpect(jsonPath("$.dbml").value("Table users {}"))
			.andExpect(jsonPath("$.dialect").value(dialect))
			.andRespond(withSuccess("{\"sql\":\"CREATE TABLE users ();\"}", MediaType.APPLICATION_JSON));

		String sql = client.dbmlToSql("Table users {}", dialect);

		assertThat(sql).isEqualTo("CREATE TABLE users ();");
		server.verify();
	}

	@Test
	void a400FromTheConversionServiceBecomesAConversionExceptionCarryingTheReturnedMessage() {
		server.expect(requestTo(FRONTEND_URL + "/api/internal/dbml/from-sql"))
			.andRespond(withBadRequest().body("{\"error\":\"Parse error at line 3: expected ')'\"}")
				.contentType(MediaType.APPLICATION_JSON));

		assertThatThrownBy(() -> client.sqlToDbml("bad sql", "postgres")).isInstanceOf(ConversionException.class)
			.hasMessage("Parse error at line 3: expected ')'");
	}

	@Test
	void aConnectionFailureBecomesAConversionExceptionNamingTheUnreachableServiceNotARawResourceAccessException() {
		server.expect(requestTo(FRONTEND_URL + "/api/internal/dbml/from-sql"))
			.andRespond(withException(new IOException("connection refused")));

		assertThatThrownBy(() -> client.sqlToDbml("CREATE TABLE users (id INT);", "postgres"))
			.isInstanceOf(ConversionException.class)
			.hasMessageContaining(FRONTEND_URL);
	}
}
