import { useState, useEffect } from 'react';
import { Card, List, Tag, Avatar, Empty, Spin, Button, message } from 'antd';
import {
  GiftOutlined,
  UserOutlined,
  CalendarOutlined,
  PhoneOutlined,
  CheckCircleOutlined,
  RightOutlined,
  HeartOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { memberApi } from '../services/api';
import { BirthdayMember, BirthdayResponse } from '../types';
import dayjs from 'dayjs';

interface BirthdayListProps {
  role: 'hq' | 'store';
}

const BirthdayList = ({ role }: BirthdayListProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [birthdayData, setBirthdayData] = useState<BirthdayResponse | null>(null);

  const fetchBirthdayMembers = async () => {
    setLoading(true);
    try {
      const res = await memberApi.getBirthdayMembers();
      setBirthdayData(res);
      if (res.issued_count > 0) {
        message.success(`已自动为 ${res.issued_count} 位本月生日会员发放生日专属优惠券`);
      }
    } catch (e) {
      console.error(e);
      message.error('获取生日会员列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBirthdayMembers();
  }, []);

  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      '金卡会员': 'gold',
      '银卡会员': 'default',
      '普通会员': 'blue',
    };
    return colors[level] || 'default';
  };

  const formatBirthday = (birthday: string) => {
    return dayjs(birthday).format('MM月DD日');
  };

  const goToMemberDetail = (memberId: number) => {
    if (role === 'hq') {
      navigate(`/hq/members/${memberId}`);
    } else {
      navigate(`/store/members/${memberId}`);
    }
  };

  const renderMemberItem = (member: BirthdayMember) => (
    <List.Item
      key={member.id}
      className="hover:bg-gray-50 rounded-lg transition-colors"
      style={{ marginBottom: '12px', padding: '12px', border: '1px solid #f0f0f0', borderRadius: '8px' }}
    >
      <div className="w-full flex items-center gap-4 cursor-pointer" onClick={() => goToMemberDetail(member.id)}>
        <div className="relative">
          <Avatar size={48} icon={<UserOutlined />} className="bg-gradient-to-br from-pink-400 to-red-500" />
          {member.is_birthday_today && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <HeartOutlined className="text-white text-xs" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-gray-800">{member.name}</span>
            <Tag color={getLevelColor(member.level)}>{member.level}</Tag>
            {member.is_birthday_today && (
              <Tag color="red" icon={<HeartOutlined />}>今天生日</Tag>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <CalendarOutlined />
              {formatBirthday(member.birthday!)}
            </span>
            <span className="flex items-center gap-1">
              <PhoneOutlined />
              {member.phone}
            </span>
            <span>{member.age}岁</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            {member.days_until_birthday === 0 ? (
              <span className="text-red-500 font-medium">🎉 今天生日</span>
            ) : member.days_until_birthday > 0 ? (
              <span className="text-orange-500 font-medium">还有 {member.days_until_birthday} 天</span>
            ) : (
              <span className="text-gray-400">已过生日</span>
            )}
            <div className="flex items-center gap-1 justify-end mt-1">
              {member.has_birthday_coupon ? (
                <span className="text-green-500 text-sm flex items-center gap-1">
                  <CheckCircleOutlined /> 已发优惠券
                </span>
              ) : (
                <span className="text-gray-400 text-sm flex items-center gap-1">
                  <GiftOutlined /> 未发放
                </span>
              )}
            </div>
          </div>

          <Button type="text" icon={<RightOutlined />} />
        </div>
      </div>
    </List.Item>
  );

  const todayMembers = birthdayData?.list.filter(m => m.is_birthday_today) || [];
  const upcomingMembers = birthdayData?.list.filter(m => !m.is_birthday_today && m.days_until_birthday > 0) || [];
  const passedMembers = birthdayData?.list.filter(m => m.days_until_birthday === 0 && !m.is_birthday_today) || [];

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <HeartOutlined className="text-red-500 text-xl" />
          <span>本月生日会员</span>
          {birthdayData && (
            <Tag color="red">{birthdayData.total} 人</Tag>
          )}
        </div>
      }
      extra={
        birthdayData?.coupon_info && (
          <Tag color="green" icon={<GiftOutlined />}>
            生日券：{birthdayData.coupon_info.name}（{birthdayData.coupon_info.value}元）
          </Tag>
        )
      }
      className="shadow-md"
    >
      <Spin spinning={loading}>
        {!loading && birthdayData && birthdayData.total === 0 ? (
          <Empty description="本月暂无生日会员" />
        ) : (
          <div className="space-y-6">
            {todayMembers.length > 0 && (
              <div>
                <h4 className="text-red-500 font-medium mb-3 flex items-center gap-2">
                  <HeartOutlined /> 今天生日（{todayMembers.length}人）
                </h4>
                <List
                  dataSource={todayMembers}
                  renderItem={renderMemberItem}
                  split={false}
                />
              </div>
            )}

            {upcomingMembers.length > 0 && (
              <div>
                <h4 className="text-orange-500 font-medium mb-3 flex items-center gap-2">
                  <CalendarOutlined /> 即将过生日（{upcomingMembers.length}人）
                </h4>
                <List
                  dataSource={upcomingMembers}
                  renderItem={renderMemberItem}
                  split={false}
                />
              </div>
            )}

            {passedMembers.length > 0 && (
              <div>
                <h4 className="text-gray-400 font-medium mb-3 flex items-center gap-2">
                  <CalendarOutlined /> 已过生日（{passedMembers.length}人）
                </h4>
                <List
                  dataSource={passedMembers}
                  renderItem={renderMemberItem}
                  split={false}
                />
              </div>
            )}
          </div>
        )}
      </Spin>
    </Card>
  );
};

export default BirthdayList;
