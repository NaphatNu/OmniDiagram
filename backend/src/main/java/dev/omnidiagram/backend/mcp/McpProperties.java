package dev.omnidiagram.backend.mcp;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "mcp")
public record McpProperties(@NotBlank String apiKey) {
}
