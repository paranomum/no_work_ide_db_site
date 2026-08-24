package ru.paranomum.test_recorder.back.entity;

import java.io.Serializable;
import java.util.Objects;

public class ScenarioBackendRequestId implements Serializable {

	private Long scenarioId;
	private Long backendRequestId;

	protected ScenarioBackendRequestId() {
	}

	public ScenarioBackendRequestId(
			Long scenarioId,
			Long backendRequestId
	) {
		this.scenarioId = scenarioId;
		this.backendRequestId = backendRequestId;
	}

	@Override
	public boolean equals(Object object) {
		if (this == object) {
			return true;
		}

		if (!(object instanceof ScenarioBackendRequestId that)) {
			return false;
		}

		return Objects.equals(scenarioId, that.scenarioId)
				&& Objects.equals(backendRequestId, that.backendRequestId);
	}

	@Override
	public int hashCode() {
		return Objects.hash(scenarioId, backendRequestId);
	}
}