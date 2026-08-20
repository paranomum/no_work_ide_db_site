import { useState } from 'react';
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  MoreOutlined,
  CloudDownloadOutlined,
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

import styles from './ScenarioItem.module.css';
import type { ScenarioListItem } from '../../types/scenario';

interface ScenarioItemProps {
  scenario: ScenarioListItem;
  onOpen: (scenarioId: string) => void;
  onDownload: (scenarioId: string) => void;
  onDownloadWithoutRelated: (scenarioId: string) => void;
  onEdit: (scenarioId: string) => void;
  onDelete: (scenarioId: string) => void;
  hideActions?: boolean;
}

export function ScenarioItem({
  scenario,
  onOpen,
  onDownload,
  onDownloadWithoutRelated,
  onEdit,
  onDelete,
  hideActions = false,
}: ScenarioItemProps) {
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const menuItems: MenuProps['items'] = [
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


      <Space size={4} className={styles.actions}>
        <Tooltip title="Скачать сценарий">
          <Button
            type="text"
            icon={<CloudDownloadOutlined />}
            aria-label={`Скачать сценарий: ${scenario.name}`}
            onClick={() => onDownload(scenario.id)}
          />
        </Tooltip>

        <Tooltip title="Скачать развернутый сценарий">
          <Button
            type="text"
            icon={<DownloadOutlined />}
            aria-label={`Скачать развернутый сценарий: ${scenario.name}`}
            onClick={() => onDownloadWithoutRelated(scenario.id)}
          />
        </Tooltip>

        <Dropdown
          trigger={['click']}
          menu={{ items: menuItems }}
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
  onConfirm={() => {
    onDelete(scenario.id);
    setIsDeleteModalOpen(false);
  }}
  onCancel={() => setIsDeleteModalOpen(false)}
>
  <span className={styles.hiddenConfirmationAnchor} />
</Popconfirm>
    </article>
  );
}
