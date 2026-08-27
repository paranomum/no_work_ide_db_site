package ru.paranomum.test_recorder.back.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.paranomum.test_recorder.back.entity.ScenarioTag;
import ru.paranomum.test_recorder.back.entity.ScenarioTagId;

import java.util.Collection;
import java.util.List;

public interface ScenarioTagRepository
		extends JpaRepository<ScenarioTag, ScenarioTagId> {

	boolean existsByScenarioIdAndTagId(Long scenarioId, Long tagId);

	List<ScenarioTag> findAllByScenarioId(Long scenarioId);

	void deleteByScenarioIdAndTagId(Long scenarioId, Long tagId);

	void deleteAllByScenarioId(Long scenarioId);

	List<ScenarioTag> findAllByScenarioIdIn(Collection<Long> scenarioIds);
}