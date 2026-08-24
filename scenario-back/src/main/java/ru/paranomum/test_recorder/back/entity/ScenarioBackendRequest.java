package ru.paranomum.test_recorder.back.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "scenario_backend_requests")
@IdClass(ScenarioBackendRequestId.class)
public class ScenarioBackendRequest {

	@Id
	@Column(name = "scenario_id")
	private Long scenarioId;

	@Id
	@Column(name = "backend_request_id")
	private Long backendRequestId;

	protected ScenarioBackendRequest() {
	}

	public ScenarioBackendRequest(
			Long scenarioId,
			Long backendRequestId
	) {
		this.scenarioId = scenarioId;
		this.backendRequestId = backendRequestId;
	}

	public Long getScenarioId() {
		return scenarioId;
	}

	public Long getBackendRequestId() {
		return backendRequestId;
	}
}