import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

import type { ScenarioResponse } from '../../../shared/types/scenario';
import type {
  ScenarioCustomMethodResolution,
} from '../model/scenarioCustomMethodImport.types';

interface ScenarioCustomMethodTableProps {
  resolutions: ScenarioCustomMethodResolution[];
  availableScenarios: ScenarioResponse[];
  disabled: boolean;
  onSelectScenario: (
    importedCustomMethodName: string,
    scenarioId: number,
  ) => void;
}

function getResolutionLabel(
  resolution: ScenarioCustomMethodResolution,
): string {
  if (resolution.kind === 'existing') {
    return 'Найден автоматически';
  }

  if (resolution.kind === 'selected-existing') {
    return 'Выбран вручную';
  }

  return 'Не найден';
}

function getResolutionColor(
  resolution: ScenarioCustomMethodResolution,
): string {
  if (resolution.kind === 'existing') {
    return 'success';
  }

  if (resolution.kind === 'selected-existing') {
    return 'processing';
  }

  return 'error';
}

export function ScenarioCustomMethodTable({
  resolutions,
  availableScenarios,
  disabled,
  onSelectScenario,
}: ScenarioCustomMethodTableProps) {
  const unresolvedCount = resolutions.filter(
    (resolution) => resolution.kind === 'unresolved',
  ).length;

  const columns: ColumnsType<ScenarioCustomMethodResolution> = [
    {
      title: 'Custom method из файла',
      key: 'importedCustomMethod',
      width: '34%',
      render: (_, resolution) => (
        <Typography.Text code>
          {resolution.importedCustomMethod.name}
        </Typography.Text>
      ),
    },
    {
      title: 'Сценарий на платформе',
      key: 'targetScenario',
      render: (_, resolution) => (
        <Select
          showSearch
          allowClear={false}
          disabled={disabled || availableScenarios.length === 0}
          placeholder="Выберите существующий сценарий"
          value={resolution.targetScenario?.id}
          optionFilterProp="label"
          options={availableScenarios.map((scenario) => ({
            value: scenario.id,
            label: scenario.name,
          }))}
          style={{ width: '100%' }}
          onChange={(scenarioId: number) =>
            onSelectScenario(
              resolution.importedCustomMethod.name,
              scenarioId,
            )
          }
        />
      ),
    },
    {
      title: 'Статус',
      key: 'status',
      width: 190,
      render: (_, resolution) => (
        <Tag
          color={getResolutionColor(resolution)}
          icon={
            resolution.kind === 'unresolved' ? (
              <ExclamationCircleOutlined />
            ) : (
              <CheckCircleOutlined />
            )
          }
        >
          {getResolutionLabel(resolution)}
        </Tag>
      ),
    },
  ];

  if (resolutions.length === 0) {
    return null;
  }

  return (
    <section>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div>
          <Typography.Title level={4} style={{ marginBottom: 4 }}>
            Переиспользуемые сценарии
          </Typography.Title>

          <Typography.Text type="secondary">
            Каждый action с типом customMethod должен быть связан со
            сценарием, доступным на текущей платформе.
          </Typography.Text>
        </div>

        {unresolvedCount > 0 && (
          <Alert
            type="warning"
            showIcon
            message={`Не найдено custom methods: ${unresolvedCount}`}
            description="Выберите существующие сценарии в таблице или сначала создайте недостающие сценарии, затем обновите список."
          />
        )}

        <Table<ScenarioCustomMethodResolution>
          rowKey={(resolution) =>
            resolution.importedCustomMethod.name
          }
          columns={columns}
          dataSource={resolutions}
          pagination={false}
          size="middle"
        />
      </Space>
    </section>
  );
}
