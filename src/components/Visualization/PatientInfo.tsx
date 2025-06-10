import React from "react";

interface PatientInfoProps {
  name: string;
  gender: "男" | "女";
  age: number;
  height: number; // cm
  weight: number; // kg
}

const PatientInfo: React.FC<PatientInfoProps> = ({ name, gender, age, height, weight }) => {
  return (
    <div className="bg-white rounded-xl shadow-md p-4 w-full h-full">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">患者信息</h2>
      <div className="grid grid-cols-2 gap-y-3 text-sm text-gray-700">
        <div><span className="font-medium">姓名：</span>{name}</div>
        <div><span className="font-medium">性别：</span>{gender}</div>
        <div><span className="font-medium">年龄：</span>{age} 岁</div>
        <div><span className="font-medium">身高：</span>{height} cm</div>
        <div><span className="font-medium">体重：</span>{weight} kg</div>
      </div>
    </div>
  );
};

export default PatientInfo;