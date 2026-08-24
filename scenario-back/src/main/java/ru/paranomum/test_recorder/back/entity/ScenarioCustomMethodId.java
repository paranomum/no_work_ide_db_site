package ru.paranomum.test_recorder.back.entity;

import java.io.Serializable;
import java.util.Objects;

public class ScenarioCustomMethodId implements Serializable {

	private Long sourceScenarioId;
	private Long targetScenarioId;

	protected ScenarioCustomMethodId() {
	}

	public ScenarioCustomMethodId(
			Long sourceScenarioId,
			Long targetScenarioId
	) {
		this.sourceScenarioId = sourceScenarioId;
		this.targetScenarioId = targetScenarioId;
	}

	@Override
	public boolean equals(Object object) {
		if (this == object) {
			return true;
		}

		if (!(object instanceof ScenarioCustomMethodId that)) {
			return false;
		}

		return Objects.equals(
				sourceScenarioId,
				that.sourceScenarioId
		) && Objects.equals(
				targetScenarioId,
				that.targetScenarioId
		);
	}

	@Override
	public int hashCode() {
		return Objects.hash(sourceScenarioId, targetScenarioId);
	}
}