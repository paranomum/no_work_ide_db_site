import {
  FileAddOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Button, Card, Empty, Typography, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Virtuoso } from 'react-virtuoso';

import { AppInput } from '../../shared/ui/AppInput/AppInput';
import {
  ScenarioItem,
} from '../../shared/ui/ScenarioItem/ScenarioItem';
import type { ScenarioListItem } from '../../shared/types/scenario';
import styles from './ScenarioListPage.module.css';

const { Title, Text } = Typography;

const DEFAULT_SCENARIOS: ScenarioListItem[] = [
  {
    id: 'scenario-1',
    name: 'Обработка кандидата: массовый подбор',
    tags: ['вакансия', 'заявка', 'кандидат'],
  },
  {
    id: 'scenario-2',
    name: 'Создание вакансии',
    tags: ['вакансия'],
  },
  {
    id: 'scenario-3',
    name: 'Создание и согласование заявки',
    tags: ['заявка', 'согласование'],
  },
  {
    id: 'scenario-4',
    name: 'Оформление оффера',
    tags: ['оффер', 'кандидат'],
  },
  {
    id: 'scenario-5',
    name: 'Перевод кандидата на этап воронки',
    tags: ['кандидат', 'воронка'],
  },
];

function getStoredScenarios(): ScenarioListItem[] {
  const storedScenarios = localStorage.getItem('scenario-db.scenarios');

  if (!storedScenarios) {
    return DEFAULT_SCENARIOS;
  }

  try {
    const parsedScenarios = JSON.parse(
      storedScenarios,
    ) as ScenarioListItem[];

    if (!Array.isArray(parsedScenarios) || parsedScenarios.length === 0) {
      return DEFAULT_SCENARIOS;
    }

    return parsedScenarios;
  } catch {
    return DEFAULT_SCENARIOS;
  }
}

function downloadMockFile(
  scenario: ScenarioListItem,
  includeRelated: boolean,
) {
  const fileContent = {
    id: scenario.id,
    name: scenario.name,
    tags: scenario.tags,
    includeRelated,
    message:
      'Mock-экспорт. Подстановка значений переменных профиля и обработка связанных сценариев будет реализована backend-ом.',
  };

  const blob = new Blob([JSON.stringify(fileContent, null, 2)], {
    type: 'application/json;charset=utf-8',
  });

  const url = URL.createObjectURL(blob);

  const fileName = `${scenario.name
    .toLocaleLowerCase('ru-RU')
    .replace(/[^a-zа-яё0-9]+/gi, '-')
    .replace(/^-|-$/g, '')}${includeRelated ? '' : '-без-связанных'}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

export function ScenarioListPage() {
  const navigate = useNavigate();

  const [searchValue, setSearchValue] = useState('');
  const [scenarios, setScenarios] =
    useState<ScenarioListItem[]>(getStoredScenarios);

  useEffect(() => {
    localStorage.setItem(
      'scenario-db.scenarios',
      JSON.stringify(scenarios),
    );
  }, [scenarios]);

  const filteredScenarios = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLocaleLowerCase('ru-RU');

    if (!normalizedSearch) {
      return scenarios;
    }

    return scenarios.filter((scenario) => {
      const searchableValue = [
        scenario.name,
        ...scenario.tags,
      ]
        .join(' ')
        .toLocaleLowerCase('ru-RU');

      return searchableValue.includes(normalizedSearch);
    });
  }, [scenarios, searchValue]);

  const openScenario = (scenarioId: string) => {
    navigate(`/scenarios/${scenarioId}`);
  };

  const editScenario = (scenarioId: string) => {
    navigate(`/scenarios/${scenarioId}`);
  };

  const downloadScenario = (scenarioId: string) => {
    const scenario = scenarios.find((item) => item.id === scenarioId);

    if (!scenario) {
      message.error('Сценарий не найден');
      return;
    }

    downloadMockFile(scenario, true);
    message.success('Сценарий скачан');
  };

  const downloadScenarioWithoutRelated = (scenarioId: string) => {
    const scenario = scenarios.find((item) => item.id === scenarioId);

    if (!scenario) {
      message.error('Сценарий не найден');
      return;
    }

    downloadMockFile(scenario, false);
    message.success('Сценарий без связанных сценариев скачан');
  };

  const deleteScenario = (scenarioId: string) => {
    setScenarios((currentScenarios) =>
      currentScenarios.filter((scenario) => scenario.id !== scenarioId),
    );

    message.success('Сценарий удалён');
  };

  const createScenario = () => {
    message.info(
      'Создание сценария будет добавлено вместе со страницей сценария',
    );
  };

  return (
    <main className={styles.page}>
  		<div className={styles.content}>
        <div className={styles.header}>
  <div>
    <Title level={2} className={styles.title}>
      Сценарии
    </Title>

    <Text type="secondary">
      Поиск, просмотр и скачивание сценариев прогона
    </Text>
  </div>
</div>

<div className={styles.searchRow}>
  <AppInput
    allowClear
    size="large"
    prefix={<SearchOutlined />}
    placeholder="Поиск по названию или тегам"
    value={searchValue}
    onChange={(event) => setSearchValue(event.target.value)}
  />

  <Button
    type="primary"
    size="large"
    icon={<FileAddOutlined />}
    onClick={createScenario}
  >
    Новый сценарий
  </Button>
</div>

		<Text type="secondary" className={styles.counter}>
  Найдено сценариев: {filteredScenarios.length}
</Text>

        <Card
          className={styles.listCard}
        >
          {filteredScenarios.length === 0 ? (
            <Empty
              className={styles.empty}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                searchValue
                  ? 'По вашему запросу сценарии не найдены'
                  : 'Сценариев пока нет'
              }
            />
          ) : (
            <Virtuoso
              className={styles.virtuoso}
              data={filteredScenarios}
              computeItemKey={(_, scenario) => scenario.id}
              itemContent={(_, scenario) => (
                <ScenarioItem
                  scenario={scenario}
                  onOpen={openScenario}
                  onEdit={editScenario}
                  onDownload={downloadScenario}
                  onDownloadWithoutRelated={
                    downloadScenarioWithoutRelated
                  }
                  onDelete={deleteScenario}
                />
              )}
            />
          )}
        </Card>
       </div>
    </main>
  );
}
