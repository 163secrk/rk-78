import { useState, useEffect } from 'react';
import { Table, Input, Space, Select, DatePicker, Button, Form, Tag, Tooltip } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { operationLogApi } from '../../services/api';
import { OperationLog, OperationTypeOption, OperatorOption } from '../../types';

const { RangePicker } = DatePicker;
const { Option } = Select;

const operationTypeColors: Record<string, string> = {
  member_create: 'green',
  member_update: 'blue',
  member_delete: 'red',
  coupon_create: 'cyan',
  coupon_update: 'geekblue',
  coupon_delete: 'magenta',
  coupon_issue: 'purple',
  coupon_issue_all: 'volcano',
  coupon_redeem: 'orange',
  coupon_expire: 'default',
  points_adjust: 'gold',
  transaction_create: 'lime',
  birthday_coupon_issue: 'pink',
};

const HqOperationLogs = () => {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [operationTypes, setOperationTypes] = useState<OperationTypeOption[]>([]);
  const [operators, setOperators] = useState<OperatorOption[]>([]);
  const [form] = Form.useForm();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const values = form.getFieldsValue();
      const params: any = {
        page,
        pageSize,
        operation_type: values.operation_type,
        operator_id: values.operator_id,
        keyword: values.keyword,
      };

      if (values.date_range && values.date_range.length === 2) {
        params.start_date = values.date_range[0].format('YYYY-MM-DD');
        params.end_date = values.date_range[1].format('YYYY-MM-DD');
      }

      const res = await operationLogApi.getList(params);
      setLogs(res.list);
      setTotal(res.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchOperationTypes = async () => {
    try {
      const res = await operationLogApi.getOperationTypes();
      setOperationTypes(res);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchOperators = async () => {
    try {
      const res = await operationLogApi.getOperators();
      setOperators(res);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchOperationTypes();
    fetchOperators();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [page, pageSize]);

  const handleSearch = () => {
    setPage(1);
    fetchLogs();
  };

  const handleReset = () => {
    form.resetFields();
    setPage(1);
    fetchLogs();
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
    },
    {
      title: '操作时间',
      dataIndex: 'created_at',
      width: 170,
      render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作人',
      dataIndex: 'operator_name',
      width: 100,
      render: (text: string, record: OperationLog) => (
        <Tooltip title={`ID: ${record.operator_id}`}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '操作类型',
      dataIndex: 'operation_type_label',
      width: 120,
      render: (text: string, record: OperationLog) => (
        <Tag color={operationTypeColors[record.operation_type] || 'default'}>
          {text}
        </Tag>
      ),
    },
    {
      title: '操作详情',
      dataIndex: 'detail',
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span className="text-gray-700">{text || '-'}</span>
        </Tooltip>
      ),
    },
    {
      title: '关联对象',
      width: 120,
      render: (_: any, record: OperationLog) => (
        <span>
          {record.target_type && record.target_id
            ? `${record.target_type} #${record.target_id}`
            : '-'}
        </span>
      ),
    },
    {
      title: '门店',
      dataIndex: 'store_name',
      width: 100,
      render: (text: string) => text || '-',
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="mb-6">
        <Form form={form} layout="inline">
          <Form.Item name="operation_type" label="操作类型">
            <Select
              placeholder="请选择"
              allowClear
              style={{ width: 150 }}
            >
              {operationTypes.map((type) => (
                <Option key={type.value} value={type.value}>
                  {type.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="operator_id" label="操作人">
            <Select
              placeholder="请选择"
              allowClear
              style={{ width: 150 }}
            >
              {operators.map((op) => (
                <Option key={op.id} value={op.id}>
                  {op.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="date_range" label="时间范围">
            <RangePicker style={{ width: 260 }} />
          </Form.Item>

          <Form.Item name="keyword" label="关键词">
            <Input
              placeholder="搜索操作人或详情"
              style={{ width: 200 }}
              allowClear
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleSearch}
              >
                查询
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleReset}
              >
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </div>

      <div className="mb-4 flex justify-between items-center">
        <span className="text-gray-500">
          共 <span className="text-blue-600 font-semibold">{total}</span> 条记录
        </span>
      </div>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={logs}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (t) => `共 ${t} 条`,
          pageSizeOptions: ['10', '20', '50', '100'],
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
        scroll={{ x: 1000 }}
      />
    </div>
  );
};

export default HqOperationLogs;
