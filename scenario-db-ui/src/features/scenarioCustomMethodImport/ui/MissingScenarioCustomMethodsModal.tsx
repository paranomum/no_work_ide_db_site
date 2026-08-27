import {
  ExclamationCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  TableOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  List,
  Modal,
  Space,
  Typography,
} from 'antd';

interface MissingScenarioCustomMethodsModalProps {
  open: boolean;
  missingMethodNames: string[];
  isRefreshing: boolean;
  onOpenScenarioCreate: () => void;
  onRefresh: () => void;
  onClose: () => void;
}

export function MissingScenarioCustomMethodsModal({
  open,
  missingMethodNames,
  isRefreshing,
  onOpenScenarioCreate,
  onRefresh,
  onClose,
}: MissingScenarioCustomMethodsModalProps) {
  return (
    <Modal
      open={open}
      closable={false}
      maskClosable={false}
      keyboard={false}
      footer={
        <Space wrap>
          <Button
            icon={<TableOutlined />}
            disabled={isRefreshing}
            onClick={onClose}
          >
            Выбрать существующие в таблице
          </Button>

          <Button
            icon={<PlusOutlined />}
            disabled={isRefreshing}
            onClick={onOpenScenarioCreate}
          >
            Создать недостающие сценарии
          </Button>

          <Button
            type="primary"
            icon={<ReloadOutlined />}
            loading={isRefreshing}
            onClick={onRefresh}
          >
            Проверить снова
          </Button>
        </Space>
      }
      title={
        <Space>
          <ExclamationCircleOutlined
            style={{ color: '#faad14' }}
          />
          <span>Не найдены переиспользуемые сценарии</span>
        </Space>
      }
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Alert
          type="warning"
          showIcon
          message="Перед импортом разрешите все custom methods"
          description="Можно выбрать существующий сценарий в таблице основной формы или сначала создать недостающий сценарий в новой вкладке."
        />

        <Typography.Text>
          Не найдены сценарии:
        </Typography.Text>

        <List
          bordered
          size="small"
          dataSource={missingMethodNames}
          renderItem={(methodName) => (
            <List.Item>
              <Typography.Text code>{methodName}</Typography.Text>
            </List.Item>
          )}
        />

        <Typography.Text type="secondary">
          Если вы создали недостающий сценарий в другой вкладке,
          вернитесь сюда и нажмите «Проверить снова».
        </Typography.Text>
      </Space>
    </Modal>
  );
}
