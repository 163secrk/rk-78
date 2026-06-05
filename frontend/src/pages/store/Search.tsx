import { useState, useEffect } from 'react';
import { Input, Button, List, Card, Tag, Empty, Spin } from 'antd';
import { SearchOutlined, UserOutlined, PhoneOutlined, GiftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { memberApi } from '../../services/api';
import { Member } from '../../types';

const StoreSearch = () => {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await memberApi.getList({ keyword: keyword.trim(), pageSize: 20 });
      setMembers(res.list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      '金卡会员': 'gold',
      '银卡会员': 'default',
      '普通会员': 'blue',
    };
    return colors[level] || 'default';
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-700 mb-2">🔍 会员搜索</h2>
          <p className="text-gray-500">输入会员姓名或手机号快速查询</p>
        </div>
        
        <div className="flex gap-3 max-w-2xl mx-auto">
          <Input
            size="large"
            placeholder="请输入会员姓名或手机号"
            prefix={<SearchOutlined />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyPress={handleKeyPress}
            allowClear
          />
          <Button
            type="primary"
            size="large"
            icon={<SearchOutlined />}
            onClick={handleSearch}
            loading={loading}
            className="px-8"
          >
            搜索
          </Button>
        </div>
      </Card>

      {searched && (
        <Spin spinning={loading}>
          {members.length > 0 ? (
            <List
              grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4 }}
              dataSource={members}
              renderItem={(member) => (
                <List.Item>
                  <Card
                    hoverable
                    className="cursor-pointer transition-all hover:shadow-lg"
                    onClick={() => navigate(`/store/members/${member.id}`)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <UserOutlined className="text-xl text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-gray-800 truncate">{member.name}</span>
                          <Tag color={getLevelColor(member.level)}>
                            {member.level}
                          </Tag>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
                          <PhoneOutlined />
                          <span>{member.phone}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <GiftOutlined className="text-orange-500" />
                          <span className="text-orange-500 font-medium">{member.points} 积分</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </List.Item>
              )}
            />
          ) : (
            <Empty description="未找到匹配的会员" />
          )}
        </Spin>
      )}
    </div>
  );
};

export default StoreSearch;
