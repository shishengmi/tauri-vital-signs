import ECG_Data from "@/components/Visualization/ECG_Data";
import BloodOxygen from "../components/Visualization/BloodOxygen";
import BloodPressure from "../components/Visualization/BloodPressure";
import BodyTemperature from "../components/Visualization/BodyTemperature";
import ECG_Canvas from "../components/Visualization/ECG_Canvas";
import Evaluate from "../components/Visualization/Evaluate";
import PatientInfo from "../components/Visualization/PatientInfo";
import Assistant from "../components/Assistant";
import AIAnalysis from "../components/AIAnalysis";
import { useState, useEffect } from "react";
import { invoke } from '@tauri-apps/api/core';

interface PatientInfoData {
  name: string;
  gender: "男" | "女";
  age: number;
  height: number;
  weight: number;
  phone: string;
  address: string;
  emergency_contact: string;
  blood_type: string;
  allergies: string[];
  medical_history: string[];
  last_checkup: string;
}

const Home = () => {
  const [patientData, setPatientData] = useState<PatientInfoData | null>(null);

  useEffect(() => {
    loadPatientInfo();
  }, []);

  const loadPatientInfo = async () => {
    try {
      const info = await invoke<PatientInfoData>('load_patient_info');
      setPatientData(info);
    } catch (error) {
      console.error('加载患者信息失败:', error);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-4 h-full p-4 text-base bg-gradient-to-r from-emerald-900 to-emerald-950">
      {/* 左侧：基础指标区域 */}
      <div className="rounded-lg p-4 flex flex-col gap-4 shadow-lg bg-gray-800 text-white">
        <div className="p-4 rounded shadow-md bg-gray-900"><Evaluate></Evaluate></div>
        <div className="p-4 rounded shadow-md bg-gray-900">
          <div className="w-full h-[300px] " id="ecg"><ECG_Canvas></ECG_Canvas></div>
        </div>
        <div className="p-4 rounded shadow-md flex-1 flex flex-col gap-2 bg-gray-900">
          <div className="flex gap-2 flex-1 bg-gray-900">
            <ECG_Data></ECG_Data>
          </div>
        </div>
      </div>

      {/* 中间：人体模型区域 + AI分析 */}
      <div className="bg-base-200 rounded-lg p-4 flex flex-col shadow bg-gray-800 text-white">
        {/* 人体模型 */}
        <div className="flex-1 rounded flex items-center justify-center shadow-md mb-4">
          <img
            src="/Veins_Medical_Diagram_clip_art.svg"
            alt="人体模型"
            className="w-full h-auto max-h-[400px] object-contain"
          />
        </div>
        
        {/* AI分析组件 */}
        <AIAnalysis />
      </div>

      {/* 右侧：用户信息与总结 */}
      <div className="bg-base-200 rounded-lg p-4 flex flex-col gap-4 shadow bg-gray-800 text-white">
        <div className="bg-base-100 p-4 rounded shadow-md flex-1 bg-gray-900">
          {patientData ? (
            <PatientInfo 
              name={patientData.name}
              gender={patientData.gender}
              age={patientData.age}
              height={patientData.height}
              weight={patientData.weight}
              phone={patientData.phone}
              address={patientData.address}
              emergencyContact={patientData.emergency_contact}
              bloodType={patientData.blood_type}
              allergies={patientData.allergies}
              medicalHistory={patientData.medical_history}
              lastCheckup={patientData.last_checkup}
            />
          ) : (
            <PatientInfo />
          )}
        </div>
        {/* 体温和血氧组件 - 优化布局 */}
        <div className="flex gap-4 flex-[1.5]">
          <div className="bg-base-100 bg-gray-900 rounded shadow-md flex-1 flex items-center justify-center">
            <BodyTemperature></BodyTemperature>
          </div>
          <div className="bg-base-100 bg-gray-900 rounded shadow-md flex-1 flex items-center justify-center">
            <BloodOxygen></BloodOxygen>
          </div>
        </div>
        {/* 血压组件 - 占比较小 */}
        <div className="bg-base-100 p-4 rounded shadow-md flex-1 bg-gray-900"><BloodPressure /></div>
      </div>
      
      {/* AI助手悬浮组件 */}
      <Assistant />
    </div>
  ); 
};

export default Home;

