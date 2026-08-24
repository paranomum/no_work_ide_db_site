package ru.paranomum.test_recorder.back.entity;

import java.io.Serializable;
import java.util.Objects;

public class ScenarioTagId implements Serializable {

	private Long scenarioId;
	private Long tagId;

	protected ScenarioTagId() {
	}

	public ScenarioTagId(Long scenarioId, Long tagId) {
		this.scenarioId = scenarioId;
		this.tagId = tagId;
	}

	@Override
	public boolean equals(Object object) {
		if (this == object) {
			return true;
		}

		if (!(object instanceof ScenarioTagId that)) {
			return false;
		}

		return Objects.equals(scenarioId, that.scenarioId)
				&& Objects.equals(tagId, that.tagId);
	}

	@Override
	public int hashCode() {
		return Objects.hash(scenarioId, tagId);
	}
}