import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Save, Trash2, User, Phone, MapPin, Heart, AlertTriangle, Plus, X } from 'lucide-react';

interface PatientInfo {
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

const PatientInfoConfig: React.FC = () => {
  const [patientInfo, setPatientInfo] = useState<PatientInfo>({
    name: '',
    gender: '男',
    age: 0,
    height: 0,
    weight: 0,
    phone: '',
    address: '',
    emergency_contact: '',
    blood_type: 'A',
    allergies: [],
    medical_history: [],
    last_checkup: ''
  });
  
  const [newAllergy, setNewAllergy] = useState('');
  const [newMedicalHistory, setNewMedicalHistory] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // 加载患者信息
  useEffect(() => {
    loadPatientInfo();
  }, []);

  const loadPatientInfo = async () => {
    try {
      const info = await invoke<PatientInfo>('load_patient_info');
      setPatientInfo(info);
    } catch (error) {
      console.error('加载患者信息失败:', error);
      showMessage('error', '加载患者信息失败');
    }
  };

  const savePatientInfo = async () => {
    setLoading(true);
    try {
      await invoke('save_patient_info', { patientInfo });
      showMessage('success', '患者信息保存成功');
    } catch (error) {
      console.error('保存患者信息失败:', error);
      showMessage('error', '保存患者信息失败');
    } finally {
      setLoading(false);
    }
  };

  const deletePatientInfo = async () => {
    if (!confirm('确定要删除所有患者信息吗？此操作不可恢复。')) {
      return;
    }
    
    setLoading(true);
    try {
      await invoke('delete_patient_info');
      setPatientInfo({
        name: '',
        gender: '男',
        age: 0,
        height: 0,
        weight: 0,
        phone: '',
        address: '',
        emergency_contact: '',
        blood_type: 'A',
        allergies: [],
        medical_history: [],
        last_checkup: ''
      });
      showMessage('success', '患者信息已删除');
    } catch (error) {
      console.error('删除患者信息失败:', error);
      showMessage('error', '删除患者信息失败');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const addAllergy = () => {
    if (newAllergy.trim() && !patientInfo.allergies.includes(newAllergy.trim())) {
      setPatientInfo(prev => ({
        ...prev,
        allergies: [...prev.allergies, newAllergy.trim()]
      }));
      setNewAllergy('');
    }
  };

  const removeAllergy = (index: number) => {
    setPatientInfo(prev => ({
      ...prev,
      allergies: prev.allergies.filter((_, i) => i !== index)
    }));
  };

  const addMedicalHistory = () => {
    if (newMedicalHistory.trim()) {
      setPatientInfo(prev => ({
        ...prev,
        medical_history: [...prev.medical_history, newMedicalHistory.trim()]
      }));
      setNewMedicalHistory('');
    }
  };

  const removeMedicalHistory = (index: number) => {
    setPatientInfo(prev => ({
      ...prev,
      medical_history: prev.medical_history.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* 消息提示 */}
      {message && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-green-900/20 border-green-500/30 text-green-400'
            : 'bg-red-900/20 border-red-500/30 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* 基本信息 */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center gap-3 mb-6">
          <User className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-bold text-white">基本信息</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">姓名</label>
            <input
              type="text"
              value={patientInfo.name}
              onChange={(e) => setPatientInfo(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入患者姓名"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">性别</label>
            <select
              value={patientInfo.gender}
              onChange={(e) => setPatientInfo(prev => ({ ...prev, gender: e.target.value as "男" | "女" }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="男">男</option>
              <option value="女">女</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">年龄</label>
            <input
              type="number"
              value={patientInfo.age || ''}
              onChange={(e) => setPatientInfo(prev => ({ ...prev, age: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="年龄"
              min="0"
              max="150"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">血型</label>
            <select
              value={patientInfo.blood_type}
              onChange={(e) => setPatientInfo(prev => ({ ...prev, blood_type: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="A">A型</option>
              <option value="B">B型</option>
              <option value="AB">AB型</option>
              <option value="O">O型</option>
              <option value="未知">未知</option>
            </select>
          </div>
        </div>
      </div>

      {/* 体征信息 */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center gap-3 mb-6">
          <Heart className="w-6 h-6 text-red-400" />
          <h2 className="text-xl font-bold text-white">体征信息</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">身高 (cm)</label>
            <input
              type="number"
              value={patientInfo.height || ''}
              onChange={(e) => setPatientInfo(prev => ({ ...prev, height: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="身高"
              min="0"
              max="300"
              step="0.1"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">体重 (kg)</label>
            <input
              type="number"
              value={patientInfo.weight || ''}
              onChange={(e) => setPatientInfo(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="体重"
              min="0"
              max="500"
              step="0.1"
            />
          </div>
        </div>
      </div>

      {/* 联系信息 */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center gap-3 mb-6">
          <Phone className="w-6 h-6 text-green-400" />
          <h2 className="text-xl font-bold text-white">联系信息</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">电话号码</label>
            <input
              type="tel"
              value={patientInfo.phone}
              onChange={(e) => setPatientInfo(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入电话号码"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">紧急联系人</label>
            <input
              type="text"
              value={patientInfo.emergency_contact}
              onChange={(e) => setPatientInfo(prev => ({ ...prev, emergency_contact: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="紧急联系人姓名和电话"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">地址</label>
            <textarea
              value={patientInfo.address}
              onChange={(e) => setPatientInfo(prev => ({ ...prev, address: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入详细地址"
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* 医疗信息 */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle className="w-6 h-6 text-yellow-400" />
          <h2 className="text-xl font-bold text-white">医疗信息</h2>
        </div>
        
        {/* 过敏史 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">过敏史</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newAllergy}
              onChange={(e) => setNewAllergy(e.target.value)}
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="添加过敏物质"
              onKeyPress={(e) => e.key === 'Enter' && addAllergy()}
            />
            <button
              onClick={addAllergy}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              添加
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {patientInfo.allergies.map((allergy, index) => (
              <span key={index} className="bg-red-500/20 text-red-300 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                {allergy}
                <button
                  onClick={() => removeAllergy(index)}
                  className="hover:text-red-100"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
        
        {/* 病史 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">病史</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newMedicalHistory}
              onChange={(e) => setNewMedicalHistory(e.target.value)}
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="添加病史记录"
              onKeyPress={(e) => e.key === 'Enter' && addMedicalHistory()}
            />
            <button
              onClick={addMedicalHistory}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              添加
            </button>
          </div>
          <div className="space-y-2">
            {patientInfo.medical_history.map((history, index) => (
              <div key={index} className="bg-yellow-500/20 text-yellow-200 px-3 py-2 rounded-lg text-sm flex items-center justify-between">
                <span>{history}</span>
                <button
                  onClick={() => removeMedicalHistory(index)}
                  className="hover:text-yellow-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
        
        {/* 最后检查时间 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">最后检查时间</label>
          <input
            type="datetime-local"
            value={patientInfo.last_checkup}
            onChange={(e) => setPatientInfo(prev => ({ ...prev, last_checkup: e.target.value }))}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-4">
        <button
          onClick={savePatientInfo}
          disabled={loading}
          className="flex-1 py-3 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-medium rounded-lg transition-all duration-200 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Save className="w-5 h-5" />
          {loading ? '保存中...' : '保存信息'}
        </button>
        
        <button
          onClick={deletePatientInfo}
          disabled={loading}
          className="py-3 px-6 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-all duration-200 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Trash2 className="w-5 h-5" />
          删除信息
        </button>
      </div>
    </div>
  );
};

export default PatientInfoConfig;