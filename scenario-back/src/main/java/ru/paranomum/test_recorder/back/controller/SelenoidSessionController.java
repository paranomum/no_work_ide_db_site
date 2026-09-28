package ru.paranomum.test_recorder.back.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.paranomum.test_recorder.back.dto.selenoid_session.SelenoidSessionResponse;
import ru.paranomum.test_recorder.back.service.SelenoidSessionService;

@RestController
@RequestMapping("/api/selenoid")
public class SelenoidSessionController {

	private final SelenoidSessionService service;

	public SelenoidSessionController(SelenoidSessionService service) {
		this.service = service;
	}

	@GetMapping("/sessions")
	public SelenoidSessionResponse getSessions() {
		return service.getSessions();
	}
}
