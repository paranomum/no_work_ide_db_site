package ru.paranomum.test_recorder.back.dto.selenoid_session;
import java.util.List;

public record SelenoidSessionResponse(
		int total,
		int used,
		int queued,
		int pending,
		List<Session> sessions
) {
	public record Session(
			String id,
			String browser,
			String version,
			String user,
			boolean vnc,
			String screen,
			String name
	) {
	}
}