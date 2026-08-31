import {
  FileAddOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Empty,
  Spin,
  Typography,
  message,
} from 'antd';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Virtuoso } from 'react-virtuoso';

import { http } from '../../shared/api/http';
import type {
  ScenarioListItem,
  ScenarioResponse,
} from '../../shared/types/scenario';
import { AppInput } from '../../shared/ui/AppInput/AppInput';
import { ScenarioItem } from '../../shared/ui/ScenarioItem/ScenarioItem';
import styles from './ScenarioListPage.module.css';

const { Title, Text } = Typography;

type DownloadEndpoint =
  | 'download-original'
  | 'download-full'
  | 'download-zip';

interface MissingVariable {
  variableId: number;
  name: string;
  description: string | null;
}

interface ApiProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  message?: string;
  missingVariables?: MissingVariable[];
}

function mapScenarioToListItem(
  scenario: ScenarioResponse,
): ScenarioListItem {
  return {
    id: String(scenario.id),
    name: scenario.name,
    tags: scenario.tags.map((tag) => tag.name),
  };
}

function getDownloadFileName(
  contentDisposition: string | undefined,
  fallbackName: string,
): string {
  const fileNameMatch = contentDisposition?.match(
    /filename="([^"]+)"/i,
  );

  return fileNameMatch?.[1] ?? fallbackName;
}

function getApiErrorMessage(
  error: unknown,
  defaultMessage: string,
): string {
  if (
    axios.isAxiosError(error) &&
    typeof error.response?.data?.message === 'string'
  ) {
    return error.response.data.message;
  }

  if (
    axios.isAxiosError(error) &&
    typeof error.response?.data?.detail === 'string'
  ) {
    return error.response.data.detail;
  }

  return defaultMessage;
}

function isApiProblemDetails(value: unknown): value is ApiProblemDetails {
  return typeof value === 'object' && value !== null;
}

function formatMissingVariables(
  missingVariables: unknown,
): string | null {
  if (!Array.isArray(missingVariables)) {
    return null;
  }

  const variableNames = missingVariables
    .map((variable) => {
      if (
        typeof variable === 'object' &&
        variable !== null &&
        'name' in variable &&
        typeof variable.name === 'string'
      ) {
        return variable.name.trim();
      }

      return '';
    })
    .filter(Boolean);

  if (variableNames.length === 0) {
    return null;
  }

  return variableNames.join(', ');
}

function getProblemMessage(
  problem: ApiProblemDetails,
  defaultMessage: string,
): string {
  const baseMessage =
    typeof problem.detail === 'string' && problem.detail.trim()
      ? problem.detail.trim()
      : typeof problem.message === 'string' && problem.message.trim()
        ? problem.message.trim()
        : typeof problem.title === 'string' && problem.title.trim()
          ? problem.title.trim()
          : defaultMessage;

  const missingVariables = formatMissingVariables(
    problem.missingVariables,
  );

  if (!missingVariables) {
    return baseMessage;
  }

  return `${baseMessage}: ${missingVariables}`;
}

async function getDownloadErrorMessage(
  error: unknown,
  defaultMessage: string,
): Promise<string> {
  if (!axios.isAxiosError(error)) {
    return defaultMessage;
  }

  const responseData = error.response?.data;

  if (responseData instanceof Blob) {
    try {
      const responseText = await responseData.text();
      const parsedData: unknown = JSON.parse(responseText);

      if (isApiProblemDetails(parsedData)) {
        return getProblemMessage(parsedData, defaultMessage);
      }

      return defaultMessage;
    } catch {
      return defaultMessage;
    }
  }

  if (isApiProblemDetails(responseData)) {
    return getProblemMessage(responseData, defaultMessage);
  }

  return defaultMessage;
}

export function ScenarioListPage() {
  const navigate = useNavigate();

  const [searchValue, setSearchValue] = useState('');
  const [scenarios, setScenarios] = useState<ScenarioListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  const loadScenarios = async () => {
    try {
      setIsLoading(true);
      setErrorText(null);

      const { data } = await http.get<ScenarioResponse[]>('/scenarios');

      setScenarios(data.map(mapScenarioToListItem));
    } catch (error) {
      setErrorText(
        getApiErrorMessage(
          error,
          'Не удалось загрузить список сценариев.',
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadScenarios();
  }, []);

  const filteredScenarios = useMemo(() => {
    const normalizedSearch = searchValue
      .trim()
      .toLocaleLowerCase('ru-RU');

    if (!normalizedSearch) {
      return scenarios;
    }

    return scenarios.filter((scenario) => {
      const searchableValue = [scenario.name, ...scenario.tags]
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

  const createScenario = () => {
    navigate('/scenarios/new');
  };

  const downloadFile = async (
    scenarioId: string,
    endpoint: DownloadEndpoint,
    fallbackName: string,
    successMessage: string,
  ) => {
    const scenario = scenarios.find((item) => item.id === scenarioId);

    if (!scenario) {
      message.error('Сценарий не найден');
      return;
    }

    try {
      const response = await http.get(
        `/scenarios/${scenarioId}/${endpoint}`,
        {
          responseType: 'blob',
        },
      );

      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');

      link.href = url;
      link.download = getDownloadFileName(
        response.headers['content-disposition'],
        fallbackName,
      );

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);

      message.success(successMessage);
    } catch (error) {
      const errorMessage = await getDownloadErrorMessage(
        error,
        'Не удалось скачать сценарий',
      );

      message.error(errorMessage);
    }
  };

  const downloadScenarioOriginal = async (scenarioId: string) => {
    const scenario = scenarios.find((item) => item.id === scenarioId);

    await downloadFile(
      scenarioId,
      'download-original',
      `${scenario?.name ?? 'scenario'}-original.json`,
      'Исходный JSON сценария скачан',
    );
  };

  const downloadScenarioFull = async (scenarioId: string) => {
    const scenario = scenarios.find((item) => item.id === scenarioId);

    await downloadFile(
      scenarioId,
      'download-full',
      `${scenario?.name ?? 'scenario'}-full.json`,
      'Развёрнутый сценарий скачан',
    );
  };

  const downloadScenarioZip = async (scenarioId: string) => {
    const scenario = scenarios.find((item) => item.id === scenarioId);

    await downloadFile(
      scenarioId,
      'download-zip',
      `${scenario?.name ?? 'scenario'}-related.zip`,
      'ZIP-архив сценариев скачан',
    );
  };

  const deleteScenario = async (scenarioId: string) => {
    try {
      await http.delete(`/scenarios/${scenarioId}`);

      setScenarios((currentScenarios) =>
        currentScenarios.filter(
          (scenario) => scenario.id !== scenarioId,
        ),
      );

      message.success('Сценарий удалён');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        message.error('Сценарий уже удалён');
        await loadScenarios();
        return;
      }

      message.error(
        getApiErrorMessage(error, 'Не удалось удалить сценарий'),
      );

      throw error;
    }
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

        <Card className={styles.listCard}>
          {isLoading ? (
            <div className={styles.empty}>
              <Spin />
            </div>
          ) : errorText ? (
            <Empty
              className={styles.empty}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={errorText}
            />
          ) : filteredScenarios.length === 0 ? (
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
                  onDownloadOriginal={downloadScenarioOriginal}
                  onDownloadFull={downloadScenarioFull}
                  onDownloadZip={downloadScenarioZip}
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
