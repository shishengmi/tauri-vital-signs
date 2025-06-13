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

/// 串口状态枚举
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SerialStatus {
    /// 已连接
    Connected(String),  // 包含串口名
    /// 已断开
    Disconnected,
    /// 错误状态
    Error(String),     // 包含错误信息
}