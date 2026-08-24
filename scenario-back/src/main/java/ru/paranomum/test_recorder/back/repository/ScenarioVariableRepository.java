package ru.paranomum.test_recorder.back.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.paranomum.test_recorder.back.entity.ScenarioVariable;
import ru.paranomum.test_recorder.back.entity.ScenarioVariableId;

import java.util.List;

public interface ScenarioVariableRepository
		extends JpaRepository<ScenarioVariable, ScenarioVariableId> {

	List<ScenarioVariable> findAllByScenarioIdOrderByPositionAsc(
			Long scenarioId
	);

	void deleteAllByScenarioId(Long scenarioId);
}