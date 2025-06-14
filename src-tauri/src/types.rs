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

/// LTTB数据点结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LttbDataPoint {
    /// 时间戳或索引
    pub x: f64,
    /// 归一化后的ECG值 (-1 到 1)
    pub y: f64,
}

/// 处理后的体征数据（包含LTTB压缩数据）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessedVitalSigns {
    /// 原始心电数据
    pub ecg_raw: i32,
    /// 归一化的ECG数据 (-1 到 1)
    pub ecg_normalized: f64,
    /// LTTB压缩后的ECG数据点
    pub ecg_lttb_compressed: Vec<LttbDataPoint>,
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

/// LTTB处理状态
#[derive(Debug, Clone)]
pub struct LttbProcessingState {
    /// 原始数据缓冲区
    pub raw_buffer: Vec<LttbDataPoint>,
    /// 压缩后的数据缓冲区
    pub compressed_buffer: Vec<LttbDataPoint>,
    /// 缓冲区大小
    pub buffer_size: usize,
    /// 压缩比例 (例如 10:1)
    pub compression_ratio: usize,
    /// 全局最小值（用于归一化）
    pub global_min: f64,
    /// 全局最大值（用于归一化）
    pub global_max: f64,
    /// 采样计数器
    pub sample_counter: u64,
    // 是否需要重新计算全局范围
    // pub need_recalculate_range: bool,
    // 范围更新间隔
    // pub range_update_interval: u64,
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

/// LTTB配置结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LttbConfig {
    /// 缓冲区大小（触发压缩的数据点数量）
    pub buffer_size: usize,
    /// 压缩比例（例如 10 表示 10:1 压缩）
    pub compression_ratio: usize,
    /// 是否启用动态范围调整
    pub enable_dynamic_range: bool,
    /// 范围更新间隔（数据点数量）
    pub range_update_interval: u64,
}

impl Default for LttbConfig {
    fn default() -> Self {
        Self {
            buffer_size: 1000,
            compression_ratio: 10,
            enable_dynamic_range: true,
            range_update_interval: 500,
        }
    }
}

/// ECG数据统计信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EcgStatistics {
    /// 当前心率
    pub current_heart_rate: f64,
    /// 平均心率
    pub average_heart_rate: f64,
    /// 最大心率
    pub max_heart_rate: f64,
    /// 最小心率
    pub min_heart_rate: f64,
    /// RR间隔变异性
    pub rr_variability: f64,
    /// 数据质量评分 (0-100)
    pub signal_quality: f64,
    /// 压缩效率 (压缩前/压缩后)
    pub compression_efficiency: f64,
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

/// 数据处理状态枚举
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ProcessingStatus {
    /// 空闲状态
    Idle,
    /// 正在处理
    Processing,
    /// 正在压缩
    Compressing,
    /// 错误状态
    Error(String),
}

/// 系统性能指标
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceMetrics {
    /// 数据处理速率 (点/秒)
    pub processing_rate: f64,
    /// 内存使用量 (MB)
    pub memory_usage: f64,
    /// CPU使用率 (%)
    pub cpu_usage: f64,
    /// 队列长度
    pub queue_length: usize,
    /// 压缩后数据大小减少百分比
    pub compression_ratio_achieved: f64,
}

/// 实时数据包装器
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RealtimeDataPacket {
    /// 处理后的体征数据
    pub vital_signs: ProcessedVitalSigns,
    /// ECG统计信息
    pub ecg_statistics: EcgStatistics,
    /// 处理状态
    pub processing_status: ProcessingStatus,
    /// 性能指标
    pub performance_metrics: PerformanceMetrics,
}
