package dev.omnidiagram.backend;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
@Disabled("needs a real Postgres to load the JPA/Flyway context, see #4")
class OmniDiagramApplicationTests {

	@Test
	void contextLoads() {
	}

}
