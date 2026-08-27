package ru.paranomum.test_recorder.back.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@Table(name = "scenarios")
public class Scenario {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false)
	private String name;

	@Column
	private String description;

	@Column(name = "scenario_payload_json", nullable = false)
	private String scenarioPayloadJson;

	public Scenario() {
	}

	public Scenario(
			String name,
			String description,
			String scenarioPayloadJson
	) {
		this.name = name;
		this.description = description;
		this.scenarioPayloadJson = scenarioPayloadJson;
	}

	public Long getId() {
		return id;
	}

	public String getName() {
		return name;
	}

	public String getDescription() {
		return description;
	}

	public String getScenarioPayloadJson() {
		return scenarioPayloadJson;
	}

	public void update(
			String name,
			String description,
			String scenarioPayloadJson
	) {
		this.name = name;
		this.description = description;
		this.scenarioPayloadJson = scenarioPayloadJson;
	}
}