package ru.paranomum.test_recorder.back.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import ru.paranomum.test_recorder.back.dto.selenoid_session.SelenoidSessionResponse;
import ru.paranomum.test_recorder.back.exception.SelenoidUnavailableException;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

@Service
public class SelenoidSessionService {

	private final ObjectMapper objectMapper;
	private final HttpClient httpClient;
	private final URI statusUri;
	private final String username;
	private final String password;

	public SelenoidSessionService(
			ObjectMapper objectMapper,
			@Value("${selenoid.ggr-ui-url}") String ggrUiUrl,
			@Value("${selenoid.username}") String username,
			@Value("${selenoid.password:}") String password
	) {
		this.objectMapper = objectMapper;
		this.username = username;
		this.password = password;

		this.statusUri = URI.create(
				ggrUiUrl.replaceAll("/+$", "") + "/status"
		);

		this.httpClient = HttpClient.newBuilder()
				.connectTimeout(Duration.ofSeconds(3))
				.build();
	}

	public SelenoidSessionResponse getSessions() {
		HttpRequest.Builder requestBuilder = HttpRequest.newBuilder(statusUri)
				.timeout(Duration.ofSeconds(5))
				.header(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
				.GET();

		if (!password.isBlank()) {
			String credentials = username + ":" + password;
			String encoded = Base64.getEncoder().encodeToString(
					credentials.getBytes(StandardCharsets.UTF_8)
			);
			requestBuilder.header(HttpHeaders.AUTHORIZATION, "Basic " + encoded);
		}

		HttpResponse<String> response;

		try {
			response = httpClient.send(
					requestBuilder.build(),
					HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
			);
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			throw new SelenoidUnavailableException(
					"Запрос к Ggr UI был прерван", e
			);
		} catch (IOException e) {
			throw new SelenoidUnavailableException(
					"Не удалось получить /status от Ggr UI", e
			);
		}

		if (response.statusCode() != 200) {
			throw new SelenoidUnavailableException(
					"Ggr UI вернул HTTP " + response.statusCode()
			);
		}

		JsonNode root;
		try {
			root = objectMapper.readTree(response.body());
		} catch (IOException e) {
			throw new SelenoidUnavailableException(
					"Ggr UI вернул некорректный JSON", e
			);
		}

		if (root == null || !root.isObject()) {
			throw new SelenoidUnavailableException(
					"Ggr UI вернул неожиданный формат /status"
			);
		}

		List<SelenoidSessionResponse.Session> sessions = new ArrayList<>();

		JsonNode browsers = root.path("browsers");

		if (browsers.isObject()) {
			Iterator<Map.Entry<String, JsonNode>> browserEntries = browsers.fields();

			while (browserEntries.hasNext()) {
				Map.Entry<String, JsonNode> browserEntry = browserEntries.next();
				String browserName = browserEntry.getKey();

				Iterator<Map.Entry<String, JsonNode>> versionEntries =
						browserEntry.getValue().fields();

				while (versionEntries.hasNext()) {
					Map.Entry<String, JsonNode> versionEntry = versionEntries.next();
					String version = versionEntry.getKey();

					Iterator<Map.Entry<String, JsonNode>> userEntries =
							versionEntry.getValue().fields();

					while (userEntries.hasNext()) {
						Map.Entry<String, JsonNode> userEntry = userEntries.next();
						String user = userEntry.getKey();

						JsonNode userSessions = userEntry.getValue().path("sessions");

						if (!userSessions.isArray()) {
							continue;
						}

						for (JsonNode session : userSessions) {
							String id = session.path("id").asText("");

							if (id.isBlank()) {
								continue;
							}

							sessions.add(new SelenoidSessionResponse.Session(
									id,
									browserName,
									version,
									user,
									session.path("vnc").asBoolean(false),
									session.path("screen").asText(""),
									session.path("name").asText("")
							));
						}
					}
				}
			}
		}

		return new SelenoidSessionResponse(
				root.path("total").asInt(0),
				root.path("used").asInt(0),
				root.path("queued").asInt(0),
				root.path("pending").asInt(0),
				sessions
		);
	}
}