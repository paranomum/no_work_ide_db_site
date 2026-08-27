import { useState } from 'react';
import {
  CloudDownloadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FileZipOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import {
  Button,
  Dropdown,
  Popconfirm,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { MenuProps } from 'antd';

import type { ScenarioListItem } from '../../types/scenario';
import styles from './ScenarioItem.module.css';


interface ScenarioItemProps {
  scenario: ScenarioListItem;
  onOpen: (scenarioId: string) => void;
  onDownloadOriginal: (
    scenarioId: string,
  ) => void | Promise<void>;
  onDownloadFull: (
    scenarioId: string,
  ) => void | Promise<void>;
  onDownloadZip: (
    scenarioId: string,
  ) => void | Promise<void>;
  onEdit: (scenarioId: string) => void;
  onDelete: (scenarioId: string) => Promise<void>;
  hideActions?: boolean;
}


export function ScenarioItem({
  scenario,
  onOpen,
  onDownloadOriginal,
  onDownloadFull,
  onDownloadZip,
  onEdit,
  onDelete,
  hideActions = false,
}: ScenarioItemProps) {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const downloadMenuItems: MenuProps['items'] = [
    {
      key: 'full',
      label: 'Развернутый сценарий',
      icon: <DownloadOutlined />,
      onClick: () => void onDownloadFull(scenario.id),
    },
    {
      key: 'zip',
      label: 'ZIP со связанными сценариями',
      icon: <FileZipOutlined />,
      onClick: () => void onDownloadZip(scenario.id),
    },
  ];

  const actionsMenuItems: MenuProps['items'] = [
    {
      key: 'edit',
      label: 'Редактировать',
      icon: <EditOutlined />,
      onClick: () => onEdit(scenario.id),
    },
    {
      key: 'delete',
      danger: true,
      label: 'Удалить',
      icon: <DeleteOutlined />,
      onClick: () => setIsDeleteModalOpen(true),
    },
  ];

  const confirmDelete = async () => {
    await onDelete(scenario.id);
    setIsDeleteModalOpen(false);
  };

  return (
    <article className={styles.item}>
      <button
        type="button"
        className={styles.scenarioArea}
        onClick={() => onOpen(scenario.id)}
        aria-label={`Открыть сценарий: ${scenario.name}`}
      >
        <div className={styles.scenarioInfo}>
          <Typography.Text className={styles.name} strong>
            {scenario.name}
          </Typography.Text>

          {scenario.tags.length > 0 && (
            <Space size={[6, 6]} wrap>
              {scenario.tags.map((tag) => (
                <Tag key={tag} color="blue">
                  {tag}
                </Tag>
              ))}
            </Space>
          )}
        </div>
      </button>

      {!hideActions && (
        <>
          <Space size={4} className={styles.actions}>
            <Tooltip title="Скачать исходный JSON сценария">
              <Button
                type="text"
                icon={<CloudDownloadOutlined />}
                aria-label={`Скачать исходный JSON сценария: ${scenario.name}`}
                onClick={() => void onDownloadOriginal(scenario.id)}
              />
            </Tooltip>

            <Dropdown
              trigger={['click']}
              menu={{ items: downloadMenuItems }}
              placement="bottomRight"
            >
              <Button
                type="text"
                icon={<DownloadOutlined />}
                aria-label={`Скачать дополнительные варианты сценария: ${scenario.name}`}
              >
                Скачать…
              </Button>
            </Dropdown>

            <Dropdown
              trigger={['click']}
              menu={{ items: actionsMenuItems }}
              placement="bottomRight"
            >
              <Button
                type="text"
                icon={<MoreOutlined />}
                aria-label={`Дополнительные действия: ${scenario.name}`}
              />
            </Dropdown>
          </Space>

          <Popconfirm
            title="Удалить сценарий?"
            description={`Сценарий «${scenario.name}» будет удалён без возможности восстановления.`}
            open={isDeleteModalOpen}
            okText="Удалить"
            cancelText="Отмена"
            okButtonProps={{ danger: true }}
            onConfirm={confirmDelete}
            onCancel={() => setIsDeleteModalOpen(false)}
          >
            <span className={styles.hiddenConfirmationAnchor} />
          </Popconfirm>
        </>
      )}
    </article>
  );
}
