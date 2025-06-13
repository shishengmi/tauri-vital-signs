import React from 'react';
import { useVitalSigns } from '@/hooks/useVitalSigns';

/**
 * 体温显示组件
 * 实时显示从后端获取的体温数据
 */
const BodyTemperature: React.FC = () => {
  const { data, isLoading, error } = useVitalSigns();

  // 格式化体温值显示
  const formatTemperatureValue = (value: number): string => {
    return `${value.toFixed(1)}℃`;
  };

  return (
    <div className="p-4 m-4 rounded-xl shadow-md flex flex-col justify-between">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <img src="/img/body-tempture.png" alt="体温图标" className="w-8 h-8" />
        <div className="text-base font-semibold">体温</div>
      </div>

      {/* 数据显示区域 */}
      <div className="text-center">
        {isLoading ? (
          <div className="text-2xl font-bold text-green-500">--</div>
        ) : error ? (
          <div className="text-2xl font-bold text-green-500">--</div>
        ) : data ? (
          <div className="text-2xl font-bold text-green-500">
            {formatTemperatureValue(data.body_temperature)}
          </div>
        ) : (
          <div className="text-2xl font-bold text-green-500">--</div>
        )}
      </div>
    </div>
  );
};

export default BodyTemperature;
