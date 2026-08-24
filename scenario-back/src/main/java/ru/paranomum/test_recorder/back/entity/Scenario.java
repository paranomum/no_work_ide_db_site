package ru.paranomum.test_recorder.back.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
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

	@Column(name = "created_at", nullable = false, updatable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at", nullable = false)
	private LocalDateTime updatedAt;

	protected Scenario() {
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

	public LocalDateTime getCreatedAt() {
		return createdAt;
	}

	public LocalDateTime getUpdatedAt() {
		return updatedAt;
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