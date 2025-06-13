import React from 'react';
import { useVitalSigns } from '@/hooks/useVitalSigns';

/**
 * ECG数据显示组件
 * 实时显示心率、心率变异性等ECG相关数据
 */
const ECG_Data: React.FC = () => {
  const { data, isLoading, error } = useVitalSigns();

  // 格式化数值显示
  const formatValue = (value: number, decimals: number = 1): string => {
    return value.toFixed(decimals);
  };

  // 计算RR间隔（心率的倒数，保留一位小数）
  const calculateRRInterval = (heartRate: number): number => {
    if (heartRate <= 0) return 0;
    return 60000 / heartRate; // 60秒 * 1000毫秒 / 心率 = RR间隔(ms)
  };

  // 计算心率变异性（简化计算，基于RR间隔）
  const calculateHRV = (rrInterval: number): number => {
    // 这里是一个简化的HRV计算，实际应用中需要更复杂的算法
    return Math.abs(rrInterval - 800) / 10; // 假设正常RR间隔为800ms
  };

  // 准备显示数据
  const displayData = React.useMemo(() => {
    if (!data) return [];
    
    const calculatedRRInterval = calculateRRInterval(data.heart_rate);
    
    return [
      {
        label: "心率",
        value: formatValue(data.heart_rate, 0),
        unit: "bpm"
      },
      {
        label: "心率变异性",
        value: formatValue(calculateHRV(calculatedRRInterval), 1),
        unit: "ms"
      },
      {
        label: "RR间隔",
        value: formatValue(calculatedRRInterval, 1),
        unit: "ms"
      }
    ];
  }, [data]);

  return (
    <div className="flex-1 flex flex-col p-4">
      {/* 数据显示 */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-400">--</div>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-400">--</div>
        </div>
      ) : displayData.length > 0 ? (
        <div className="flex-1 flex flex-col justify-center space-y-6">
          {displayData.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between px-2"
            >
              <div className="text-base font-medium text-gray-300 w-20 text-left">
                {item.label}
              </div>
              <div className="text-4xl font-bold text-blue-400 flex-1 text-center">
                {item.value}
              </div>
              <div className="text-base font-medium text-gray-300 w-12 text-right">
                {item.unit}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-400">--</div>
        </div>
      )}
    </div>
  );
};

export default ECG_Data;
