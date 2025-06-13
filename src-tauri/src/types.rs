use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::sync::{Arc, Mutex};

/// 体征数据结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VitalSigns {
    /// 心电数据
    pub ecg: i32,
    /// 血氧饱和度
    pub spo2: i32,
    /// 体温
    pub temp: i32,
}

/// 处理后的体征数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessedVitalSigns {
    /// 原始心电数据
    pub ecg_raw: i32,
    /// 处理后的体温
    pub body_temperature: f64,
    /// 血氧饱和度
    pub blood_oxygen: i32,
    /// 心率
    pub heart_rate: f64,
    /// RR间隔
    pub rr_interval: f64,
    /// 时间戳
    pub timestamp: u64,
}

/// 心电数据处理状态
#[derive(Debug, Clone)]
pub struct EcgProcessingState {
    pub ecg_point_max: f64,
    pub ecg_point_min: f64,
    pub ecg_point_max_new: f64,
    pub ecg_point_min_new: f64,
    pub ecg_points: VecDeque<i32>,
    pub peak_interval_num: u32,
    pub counter: u32,
    pub ecg_data_original_list: Vec<i32>,
    pub last_heart_rate: f64,
    pub last_rr_interval: f64,
}

/// 体温处理状态
#[derive(Debug, Clone)]
pub struct TemperatureProcessingState {
    pub temperatures: Vec<f64>,
    pub scale_factor: f64,
    pub offset: f64,
    pub max_temp: f64,
    pub room_temperature: f64,
}

/// 串口配置结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SerialConfig {
    /// 串口名称 (如 "COM1" 或 "/dev/ttyUSB0")
    pub port_name: String,
    /// 波特率
    pub baud_rate: u32,
}

/// 数据存储队列类型
pub type DataQueue = Arc<Mutex<VecDeque<VitalSigns>>>;
pub type ProcessedDataQueue = Arc<Mutex<VecDeque<ProcessedVitalSigns>>>;

/// 串口状态枚举
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum SerialStatus {
    Connected(String),  // 包含串口名
    Disconnected,
    Error(String),      // 包含错误信息
}