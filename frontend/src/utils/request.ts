import axios, { AxiosRequestConfig } from 'axios';
import { message } from 'antd';

const instance = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

instance.interceptors.response.use(
  (response) => {
    const res = response.data;
    if (res.code !== 0) {
      message.error(res.message || '请求失败');
      return Promise.reject(new Error(res.message || '请求失败'));
    }
    return res.data;
  },
  (error) => {
    message.error(error.message || '网络错误');
    return Promise.reject(error);
  }
);

function request<T = any>(config: AxiosRequestConfig): Promise<T> {
  return instance(config) as unknown as Promise<T>;
}

export default request;
