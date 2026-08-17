package dev.omnidiagram.backend.conversion;

import java.time.Duration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
public class ConversionClientConfig {

	private static final Duration TIMEOUT = Duration.ofSeconds(5);

	@Bean
	RestClient.Builder conversionRestClientBuilder() {
		SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
		requestFactory.setConnectTimeout(TIMEOUT);
		requestFactory.setReadTimeout(TIMEOUT);
		return RestClient.builder().requestFactory(requestFactory);
	}
}
