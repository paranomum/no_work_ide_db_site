package ru.paranomum.test_recorder.back.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "scenario_custom_methods")
@IdClass(ScenarioCustomMethodId.class)
public class ScenarioCustomMethod {

	@Id
	@Column(name = "source_scenario_id")
	private Long sourceScenarioId;

	@Id
	@Column(name = "target_scenario_id")
	private Long targetScenarioId;

	protected ScenarioCustomMethod() {
	}

	public ScenarioCustomMethod(
			Long sourceScenarioId,
			Long targetScenarioId
	) {
		this.sourceScenarioId = sourceScenarioId;
		this.targetScenarioId = targetScenarioId;
	}

	public Long getSourceScenarioId() {
		return sourceScenarioId;
	}

	public Long getTargetScenarioId() {
		return targetScenarioId;
	}
}