import axios, { AxiosRequestConfig } from 'axios';
import { message } from 'antd';

const instance = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('pharmacy_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

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
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('pharmacy_token');
      localStorage.removeItem('pharmacy_user');
      message.error(error.response.data?.message || '认证失败，请重新登录');
      window.location.href = '/login';
    } else {
      message.error(error.message || '网络错误');
    }
    return Promise.reject(error);
  }
);

function request<T = any>(config: AxiosRequestConfig): Promise<T> {
  return instance(config) as unknown as Promise<T>;
}

export default request;
