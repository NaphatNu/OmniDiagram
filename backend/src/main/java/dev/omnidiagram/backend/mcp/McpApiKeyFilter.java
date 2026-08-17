package dev.omnidiagram.backend.mcp;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class McpApiKeyFilter extends OncePerRequestFilter {

	private static final Logger log = LoggerFactory.getLogger(McpApiKeyFilter.class);
	private static final String MCP_PATH_PREFIX = "/mcp";
	private static final String BEARER_PREFIX = "Bearer ";

	private final McpProperties mcpProperties;

	public McpApiKeyFilter(McpProperties mcpProperties) {
		this.mcpProperties = mcpProperties;
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		if (!request.getRequestURI().startsWith(MCP_PATH_PREFIX)) {
			chain.doFilter(request, response);
			return;
		}

		String presented = bearerToken(request.getHeader("Authorization"));
		if (presented == null || !constantTimeEquals(presented, mcpProperties.apiKey())) {
			log.warn("Rejected MCP request from {} with a missing or invalid API key", request.getRemoteAddr());
			response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
			return;
		}

		chain.doFilter(request, response);
	}

	private static String bearerToken(String authorizationHeader) {
		if (authorizationHeader == null || !authorizationHeader.startsWith(BEARER_PREFIX)) {
			return null;
		}
		return authorizationHeader.substring(BEARER_PREFIX.length());
	}

	private static boolean constantTimeEquals(String presented, String expected) {
		return MessageDigest.isEqual(presented.getBytes(StandardCharsets.UTF_8),
				expected.getBytes(StandardCharsets.UTF_8));
	}
}
