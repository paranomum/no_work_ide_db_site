package ru.paranomum.test_recorder.back.entity;

import java.io.Serializable;
import java.util.Objects;

public class ScenarioVariableId implements Serializable {

	private Long scenarioId;
	private Long variableId;

	protected ScenarioVariableId() {
	}

	public ScenarioVariableId(Long scenarioId, Long variableId) {
		this.scenarioId = scenarioId;
		this.variableId = variableId;
	}

	@Override
	public boolean equals(Object object) {
		if (this == object) {
			return true;
		}

		if (!(object instanceof ScenarioVariableId that)) {
			return false;
		}

		return Objects.equals(scenarioId, that.scenarioId)
				&& Objects.equals(variableId, that.variableId);
	}

	@Override
	public int hashCode() {
		return Objects.hash(scenarioId, variableId);
	}
}