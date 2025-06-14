import React from 'react';
import { User, Calendar, Ruler, Weight, Heart, Phone, Clock } from 'lucide-react';

interface PatientInfoProps {
  name?: string;
  gender?: "男" | "女";
  age?: number;
  height?: number; // cm
  weight?: number; // kg
  phone?: string;
  address?: string;
  emergencyContact?: string;
  bloodType?: string;
  allergies?: string[];
  medicalHistory?: string[];
  lastCheckup?: string;
}

const PatientInfo: React.FC<PatientInfoProps> = ({ 
  name = "未设置",
  gender = "男",
  age = 0,
  height = 0,
  weight = 0,
  phone = "未设置",
  emergencyContact = "未设置",
  bloodType = "未知",
  allergies = [],
  medicalHistory = [],
  lastCheckup = "未记录"
}) => {
  const bmi = height > 0 && weight > 0 ? (weight / Math.pow(height / 100, 2)).toFixed(1) : '0.0';
  
  const getBMIStatus = (bmi: number) => {
    if (bmi < 18.5) return { text: '偏瘦', color: 'text-blue-400' };
    if (bmi < 24) return { text: '正常', color: 'text-green-400' };
    if (bmi < 28) return { text: '超重', color: 'text-yellow-400' };
    return { text: '肥胖', color: 'text-red-400' };
  };

  const bmiStatus = getBMIStatus(parseFloat(bmi));

  return (
    <div className="rounded-xl shadow-lg p-4 w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 overflow-hidden">
      {/* 头部 - 精简版 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{name}</h2>
            <p className="text-xs text-gray-400">患者档案</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-400">最后检查</div>
          <div className="text-xs text-blue-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {lastCheckup}
          </div>
        </div>
      </div>

      {/* 基本信息 - 紧凑布局 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-600">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-3 h-3 text-blue-400" />
            <span className="text-xs font-medium text-gray-300">基本信息</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">性别:</span>
              <span className="text-white">{gender}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">年龄:</span>
              <span className="text-white">{age}岁</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">血型:</span>
              <span className="text-red-400 font-medium">{bloodType}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-3 border border-gray-600">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-3 h-3 text-red-400" />
            <span className="text-xs font-medium text-gray-300">体征数据</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 flex items-center gap-1">
                <Ruler className="w-2 h-2" />
                身高:
              </span>
              <span className="text-white">{height}cm</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 flex items-center gap-1">
                <Weight className="w-2 h-2" />
                体重:
              </span>
              <span className="text-white">{weight}kg</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">BMI:</span>
              <span className={`font-medium ${bmiStatus.color}`}>
                {bmi}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 联系信息 - 精简版 */}
      <div className="bg-gray-800 rounded-lg p-3 border border-gray-600 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Phone className="w-3 h-3 text-green-400" />
          <span className="text-xs font-medium text-gray-300">联系信息</span>
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400">电话:</span>
            <span className="text-white truncate ml-2">{phone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">紧急联系:</span>
            <span className="text-white truncate ml-2">{emergencyContact}</span>
          </div>
        </div>
      </div>

      {/* 医疗信息 - 仅显示重要信息 */}
      <div className="space-y-2">
        {allergies.length > 0 && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-2">
            <h4 className="text-xs font-medium text-red-400 mb-1">过敏史</h4>
            <div className="flex flex-wrap gap-1">
              {allergies.slice(0, 3).map((allergy, index) => (
                <span key={index} className="bg-red-500/20 text-red-300 px-1 py-0.5 rounded text-xs">
                  {allergy}
                </span>
              ))}
              {allergies.length > 3 && (
                <span className="text-red-300 text-xs">+{allergies.length - 3}</span>
              )}
            </div>
          </div>
        )}
        
        {medicalHistory.length > 0 && (
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-2">
            <h4 className="text-xs font-medium text-yellow-400 mb-1">病史</h4>
            <div className="space-y-0.5">
              {medicalHistory.slice(0, 2).map((history, index) => (
                <div key={index} className="text-xs text-yellow-200 flex items-center gap-1">
                  <div className="w-1 h-1 bg-yellow-400 rounded-full flex-shrink-0"></div>
                  <span className="truncate">{history}</span>
                </div>
              ))}
              {medicalHistory.length > 2 && (
                <div className="text-xs text-yellow-300">+{medicalHistory.length - 2} 更多</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientInfo;