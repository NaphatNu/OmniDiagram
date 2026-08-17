package dev.omnidiagram.backend.mcp;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;

class McpApiKeyFilterTest {

	private final McpApiKeyFilter filter = new McpApiKeyFilter(new McpProperties("secret-key"));

	@Test
	void requestWithNoAuthorizationHeaderIsRejected() throws Exception {
		HttpServletRequest request = mockMcpRequest(null);
		HttpServletResponse response = mock(HttpServletResponse.class);
		FilterChain chain = mock(FilterChain.class);

		filter.doFilter(request, response, chain);

		verify(response).sendError(HttpServletResponse.SC_UNAUTHORIZED);
		verify(chain, never()).doFilter(any(), any());
	}

	@Test
	void requestWithTheWrongKeyIsRejected() throws Exception {
		HttpServletRequest request = mockMcpRequest("Bearer wrong-key");
		HttpServletResponse response = mock(HttpServletResponse.class);
		FilterChain chain = mock(FilterChain.class);

		filter.doFilter(request, response, chain);

		verify(response).sendError(HttpServletResponse.SC_UNAUTHORIZED);
		verify(chain, never()).doFilter(any(), any());
	}

	@Test
	void requestWithTheCorrectKeyPassesThrough() throws Exception {
		HttpServletRequest request = mockMcpRequest("Bearer secret-key");
		HttpServletResponse response = mock(HttpServletResponse.class);
		FilterChain chain = mock(FilterChain.class);

		filter.doFilter(request, response, chain);

		verify(chain).doFilter(request, response);
		verify(response, never()).sendError(anyInt());
	}

	@Test
	void aNonMcpPathIsUnaffectedByTheFilter() throws Exception {
		HttpServletRequest request = mock(HttpServletRequest.class);
		when(request.getRequestURI()).thenReturn("/actuator/health");
		HttpServletResponse response = mock(HttpServletResponse.class);
		FilterChain chain = mock(FilterChain.class);

		filter.doFilter(request, response, chain);

		verify(chain).doFilter(request, response);
		verify(response, never()).sendError(anyInt());
	}

	@Test
	void theAppFailsToStartWhenMcpApiKeyIsBlank() {
		new ApplicationContextRunner()
				.withUserConfiguration(PropertiesTestConfig.class)
				.withPropertyValues("mcp.api-key=")
				.run(context -> assertThat(context).hasFailed());
	}

	private static HttpServletRequest mockMcpRequest(String authorizationHeader) {
		HttpServletRequest request = mock(HttpServletRequest.class);
		when(request.getRequestURI()).thenReturn("/mcp");
		when(request.getHeader("Authorization")).thenReturn(authorizationHeader);
		return request;
	}

	@Configuration
	@EnableConfigurationProperties(McpProperties.class)
	static class PropertiesTestConfig {
	}
}
