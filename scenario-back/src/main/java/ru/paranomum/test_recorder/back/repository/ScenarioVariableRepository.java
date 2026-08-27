package ru.paranomum.test_recorder.back.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.paranomum.test_recorder.back.entity.ScenarioVariable;
import ru.paranomum.test_recorder.back.entity.ScenarioVariableId;

import java.util.List;
import java.util.Optional;

public interface ScenarioVariableRepository
		extends JpaRepository<ScenarioVariable, ScenarioVariableId> {

	List<ScenarioVariable> findAllByScenarioIdOrderByPositionAsc(
			Long scenarioId
	);

	Optional<ScenarioVariable> findByScenarioIdAndVariableId(
			Long scenarioId,
			Long variableId
	);

	void deleteAllByScenarioId(Long scenarioId);
}