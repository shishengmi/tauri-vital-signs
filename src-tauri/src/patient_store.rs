use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatientInfo {
    pub name: String,
    pub gender: String,
    pub age: u32,
    pub height: f32,
    pub weight: f32,
    pub phone: String,
    pub address: String,
    pub emergency_contact: String,
    pub blood_type: String,
    pub allergies: Vec<String>,
    pub medical_history: Vec<String>,
    pub last_checkup: String,
    pub created_at: String,
    pub updated_at: String,
}

impl Default for PatientInfo {
    fn default() -> Self {
        Self {
            name: "未设置".to_string(),
            gender: "男".to_string(),
            age: 0,
            height: 0.0,
            weight: 0.0,
            phone: "未设置".to_string(),
            address: "未设置".to_string(),
            emergency_contact: "未设置".to_string(),
            blood_type: "未知".to_string(),
            allergies: Vec::new(),
            medical_history: Vec::new(),
            last_checkup: "未记录".to_string(),
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
        }
    }
}

pub struct PatientStore {
    data_file: PathBuf,
}

impl PatientStore {
    pub fn new(app_handle: &tauri::AppHandle) -> Result<Self, String> {
        let app_data_dir = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| format!("无法获取应用数据目录: {}", e))?;

        let data_dir = app_data_dir.join("vital-signs");
        if !data_dir.exists() {
            fs::create_dir_all(&data_dir).map_err(|e| format!("创建数据目录失败: {}", e))?;
        }

        let data_file = data_dir.join("patient_info.json");

        Ok(Self { data_file })
    }

    pub fn save_patient_info(&self, patient_info: &PatientInfo) -> Result<(), String> {
        let mut info = patient_info.clone();
        info.updated_at = chrono::Utc::now().to_rfc3339();

        let json_data = serde_json::to_string_pretty(&info)
            .map_err(|e| format!("序列化患者信息失败: {}", e))?;

        fs::write(&self.data_file, json_data).map_err(|e| format!("保存患者信息失败: {}", e))?;

        Ok(())
    }

    pub fn load_patient_info(&self) -> Result<PatientInfo, String> {
        if !self.data_file.exists() {
            return Ok(PatientInfo::default());
        }

        let json_data =
            fs::read_to_string(&self.data_file).map_err(|e| format!("读取患者信息失败: {}", e))?;

        let patient_info: PatientInfo =
            serde_json::from_str(&json_data).map_err(|e| format!("解析患者信息失败: {}", e))?;

        Ok(patient_info)
    }

    pub fn delete_patient_info(&self) -> Result<(), String> {
        if self.data_file.exists() {
            fs::remove_file(&self.data_file).map_err(|e| format!("删除患者信息失败: {}", e))?;
        }
        Ok(())
    }
}
