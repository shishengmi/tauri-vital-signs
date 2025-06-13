import React from 'react';
import { useVitalSigns } from '@/hooks/useVitalSigns';

/**
 * 血氧饱和度显示组件
 * 实时显示从后端获取的血氧数据
 */
const BloodOxygen: React.FC = () => {
  const { data, isLoading, error } = useVitalSigns();

  // 格式化血氧值显示
  const formatOxygenValue = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="p-4 m-4 rounded-xl shadow-md flex flex-col justify-between">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <img src="/img/blood-oxygen.png" alt="血氧图标" className="w-8 h-8" />
        <div className="text-base font-semibold">血氧饱和度</div>
      </div>

      {/* 数据显示区域 */}
      <div className="text-center">
        {isLoading ? (
          <div className="text-2xl font-bold text-red-500">--</div>
        ) : error ? (
          <div className="text-2xl font-bold text-red-500">--</div>
        ) : data ? (
          <div className="text-2xl font-bold text-red-500">
            {formatOxygenValue(data.blood_oxygen)}
          </div>
        ) : (
          <div className="text-2xl font-bold text-red-500">--</div>
        )}
      </div>
    </div>
  );
};

export default BloodOxygen;
