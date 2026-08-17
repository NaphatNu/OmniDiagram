package dev.omnidiagram.backend;

import dev.omnidiagram.backend.mcp.DiagramTools;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.ai.tool.method.MethodToolCallbackProvider;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
@ConfigurationPropertiesScan
public class OmniDiagramApplication {

	public static void main(String[] args) {
		SpringApplication.run(OmniDiagramApplication.class, args);
	}

	@Bean
	public ToolCallbackProvider diagramToolCallbackProvider(DiagramTools diagramTools) {
		return MethodToolCallbackProvider.builder().toolObjects(diagramTools).build();
	}

}
