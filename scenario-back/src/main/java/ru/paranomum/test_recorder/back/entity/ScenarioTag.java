package ru.paranomum.test_recorder.back.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "scenario_tags")
@IdClass(ScenarioTagId.class)
public class ScenarioTag {

	@Id
	@Column(name = "scenario_id")
	private Long scenarioId;

	@Id
	@Column(name = "tag_id")
	private Long tagId;

	protected ScenarioTag() {
	}

	public ScenarioTag(Long scenarioId, Long tagId) {
		this.scenarioId = scenarioId;
		this.tagId = tagId;
	}

	public Long getScenarioId() {
		return scenarioId;
	}

	public Long getTagId() {
		return tagId;
	}
}