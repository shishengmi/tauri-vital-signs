import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

// 定义生命体征数据接口
interface VitalSignsData {
  timestamp: string;
  body_temperature: number;
  blood_oxygen: number;
  heart_rate: number;
  rr_interval: number;
}

// 定义hook返回的数据结构
interface UseVitalSignsReturn {
  data: VitalSignsData | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

/**
 * 自定义hook：获取生命体征数据
 * @param refreshInterval 数据刷新间隔（毫秒），默认1000ms
 * @returns 包含数据、加载状态、错误信息的对象
 */
export const useVitalSigns = (refreshInterval: number = 1000): UseVitalSignsReturn => {
  const [data, setData] = useState<VitalSignsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    // 获取处理后的数据函数
    const fetchVitalSigns = async () => {
      try {
        setError(null);
        // 调用后端API获取最新的处理后数据
        const processedData = await invoke<VitalSignsData[]>('get_processed_data', { count: 1 });
        
        if (processedData && processedData.length > 0) {
          setData(processedData[0]);
          setLastUpdated(new Date());
        }
        setIsLoading(false);
      } catch (err) {
        console.error('获取生命体征数据失败:', err);
        setError(err instanceof Error ? err.message : '获取数据失败');
        setIsLoading(false);
      }
    };

    // 立即获取一次数据
    fetchVitalSigns();

    // 设置定时器定期获取数据
    intervalId = setInterval(fetchVitalSigns, refreshInterval);

    // 清理函数
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [refreshInterval]);

  return { data, isLoading, error, lastUpdated };
};