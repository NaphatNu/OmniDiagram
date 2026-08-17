package dev.omnidiagram.backend.conversion;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

/**
 * The injected {@link RestClient.Builder} is expected to already carry the
 * connect/read timeout (see {@link ConversionClientConfig}) so that tests can
 * bind a {@code MockRestServiceServer} to a plain builder without this class
 * overwriting its request factory.
 */
@Component
public class DbmlConversionClient {

	private final RestClient restClient;
	private final String frontendUrl;

	public DbmlConversionClient(RestClient.Builder builder,
			@Value("${omnidiagram.frontend-url}") String frontendUrl) {
		this.frontendUrl = frontendUrl;
		this.restClient = builder.baseUrl(frontendUrl).build();
	}

	public String sqlToDbml(String sql, String dialect) {
		return post("/api/internal/dbml/from-sql", new FromSqlRequest(sql, dialect), FromSqlResponse.class).dbml();
	}

	public String dbmlToSql(String dbml, String dialect) {
		return post("/api/internal/dbml/to-sql", new ToSqlRequest(dbml, dialect), ToSqlResponse.class).sql();
	}

	private <T> T post(String path, Object requestBody, Class<T> responseType) {
		try {
			return restClient.post().uri(path).body(requestBody).retrieve().body(responseType);
		}
		catch (RestClientResponseException ex) {
			throw new ConversionException(extractErrorMessage(ex));
		}
		catch (ResourceAccessException ex) {
			throw new ConversionException("Conversion service unreachable at " + frontendUrl, ex);
		}
	}

	private String extractErrorMessage(RestClientResponseException ex) {
		try {
			ErrorResponse error = ex.getResponseBodyAs(ErrorResponse.class);
			if (error != null && error.error() != null && !error.error().isBlank()) {
				return error.error();
			}
		}
		catch (RuntimeException ignored) {
			// response body wasn't the expected { "error": "..." } shape; fall through
		}
		return "Conversion service returned " + ex.getStatusCode();
	}

	private record FromSqlRequest(String sql, String dialect) {
	}

	private record FromSqlResponse(String dbml) {
	}

	private record ToSqlRequest(String dbml, String dialect) {
	}

	private record ToSqlResponse(String sql) {
	}

	private record ErrorResponse(String error) {
	}
}
