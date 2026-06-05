import { useState, useEffect } from 'react';
import { Table, Input, Select, DatePicker, Button, Space, Card } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { transactionApi, memberApi } from '../../services/api';
import { Transaction, Member } from '../../types';
import { useAuthStore } from '../../store/auth';

const { RangePicker } = DatePicker;
const { Option } = Select;

const StoreTransactions = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState({
    member_id: undefined as number | undefined,
    keyword: '',
    dateRange: null as [dayjs.Dayjs, dayjs.Dayjs] | null,
  });

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        pageSize,
        store_id: user?.storeId,
      };
      if (filters.member_id) {
        params.member_id = filters.member_id;
      }
      if (filters.dateRange) {
        params.start_date = filters.dateRange[0].format('YYYY-MM-DD');
        params.end_date = filters.dateRange[1].format('YYYY-MM-DD');
      }
      const res = await transactionApi.getList(params);
      setTransactions(res.list);
      setTotal(res.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await memberApi.getList({ pageSize: 1000 });
      setMembers(res.list);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchMembers();
  }, [page, pageSize]);

  const handleSearch = () => {
    setPage(1);
    fetchTransactions();
  };

  const handleReset = () => {
    setFilters({
      member_id: undefined,
      keyword: '',
      dateRange: null,
    });
    setPage(1);
    setTimeout(fetchTransactions, 0);
  };

  const columns = [
    {
      title: '交易时间',
      dataIndex: 'created_at',
      width: 160,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '会员姓名',
      dataIndex: 'member_name',
      width: 100,
    },
    {
      title: '手机号',
      dataIndex: 'member_phone',
      width: 130,
    },
    {
      title: '门店',
      dataIndex: 'store_name',
      width: 120,
    },
    {
      title: '消费金额',
      dataIndex: 'amount',
      width: 100,
      render: (amount: number) => <span className="font-semibold">¥{amount.toFixed(2)}</span>,
    },
    {
      title: '优惠金额',
      dataIndex: 'discount_amount',
      width: 100,
      render: (amount: number) => amount > 0 ? <span className="text-red-500">-¥{amount.toFixed(2)}</span> : '-',
    },
    {
      title: '实付金额',
      width: 100,
      render: (_: any, record: Transaction) => (
        <span className="text-green-600 font-semibold">
          ¥{(record.amount - record.discount_amount).toFixed(2)}
        </span>
      ),
    },
    {
      title: '使用优惠券',
      dataIndex: 'coupon_name',
      width: 140,
      render: (name: string) => name || '-',
    },
    {
      title: '获得积分',
      dataIndex: 'points_earned',
      width: 100,
      render: (points: number) => <span className="text-orange-500">+{points}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <Card size="small">
        <Space wrap>
          <Select
            placeholder="选择会员"
            style={{ width: 200 }}
            allowClear
            value={filters.member_id}
            onChange={(value) => setFilters({ ...filters, member_id: value })}
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
            }
            options={members.map((m) => ({
              label: `${m.name} - ${m.phone}`,
              value: m.id,
            }))}
          />
          <RangePicker
            value={filters.dateRange}
            onChange={(dates) => setFilters({ ...filters, dateRange: dates as any })}
          />
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
      </Card>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={transactions}
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条记录`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
        scroll={{ x: 1100 }}
      />
    </div>
  );
};

export default StoreTransactions;
