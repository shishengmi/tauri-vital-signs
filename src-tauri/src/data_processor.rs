//! 数据处理模块
//! 
//! 本模块负责处理从串口接收到的原始体征数据，包括：
//! - ECG（心电图）数据处理和LTTB压缩
//! - 体温数据处理和滤波
//! - 血氧数据处理
//! - 心率和RR间隔计算
//! - 数据归一化和压缩算法

use crate::types::{
    VitalSigns, ProcessedVitalSigns, EcgProcessingState, TemperatureProcessingState,
    DataQueue, ProcessedDataQueue, LttbDataPoint, LttbProcessingState, LttbConfig,
    EcgStatistics, PerformanceMetrics, ProcessingStatus
};
use std::collections::VecDeque;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH, Instant};
use std::thread;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

/// 数据处理器主结构
/// 
/// 负责管理所有体征数据的处理流程，包括原始数据队列、处理后数据队列、
/// 各种处理状态以及LTTB压缩算法的集成。
pub struct DataProcessor {
    /// 原始数据队列，存储从串口接收的未处理数据
    raw_data_queue: DataQueue,
    /// 处理后数据队列，存储经过算法处理的数据
    processed_data_queue: ProcessedDataQueue,
    /// ECG数据处理状态，包含心率计算和波峰检测状态
    ecg_state: Arc<Mutex<EcgProcessingState>>,
    /// 体温数据处理状态，包含滤波和校准参数
    temp_state: Arc<Mutex<TemperatureProcessingState>>,
    /// LTTB算法处理状态，包含压缩缓冲区和配置
    lttb_state: Arc<Mutex<LttbProcessingState>>,
    /// LTTB算法配置参数
    lttb_config: LttbConfig,
    /// 数据处理线程运行状态标志
    is_running: Arc<AtomicBool>,
    /// 性能监控开始时间
    start_time: Instant,
    /// 处理的数据点总数
    total_processed: Arc<Mutex<u64>>,
}

impl DataProcessor {
    /// 创建新的数据处理器实例
    /// 
    /// # 参数
    /// * `raw_data_queue` - 原始数据队列的引用
    /// 
    /// # 返回值
    /// 返回配置完成的DataProcessor实例
    pub fn new(raw_data_queue: DataQueue) -> Self {
        // 初始化处理后数据队列，容量为1000个数据点
        let processed_data_queue = Arc::new(Mutex::new(VecDeque::with_capacity(1000)));
        
        // 初始化ECG处理状态
        let ecg_state = Arc::new(Mutex::new(EcgProcessingState {
            last_heart_rate: 0.0,
            last_rr_interval: 0.0,
            ecg_point_max: f64::NEG_INFINITY,
            ecg_point_min: f64::INFINITY,
            ecg_point_max_new: 0.0,
            ecg_point_min_new: f64::INFINITY,
            ecg_points: VecDeque::with_capacity(3),
            peak_interval_num: 0,
            counter: 0,
            ecg_data_original_list: Vec::with_capacity(250),
        }));
        
        // 初始化体温处理状态
        let temp_state = Arc::new(Mutex::new(TemperatureProcessingState {
            temperatures: Vec::with_capacity(70),
            scale_factor: 0.8,
            offset: 0.0,
            max_temp: 37.2,
            room_temperature: 23.2,
        }));
        
        // 初始化LTTB处理状态
        let lttb_config = LttbConfig::default();
        let lttb_state = Arc::new(Mutex::new(LttbProcessingState {
            raw_buffer: Vec::with_capacity(lttb_config.buffer_size),
            compressed_buffer: Vec::with_capacity(lttb_config.buffer_size / lttb_config.compression_ratio),
            buffer_size: lttb_config.buffer_size,
            compression_ratio: lttb_config.compression_ratio,
            global_min: f64::INFINITY,
            global_max: f64::NEG_INFINITY,
            sample_counter: 0,
            need_recalculate_range: false,
            range_update_interval: lttb_config.range_update_interval,
        }));
        
        Self {
            raw_data_queue,
            processed_data_queue,
            ecg_state,
            temp_state,
            lttb_state,
            lttb_config,
            is_running: Arc::new(AtomicBool::new(false)),
            start_time: Instant::now(),
            total_processed: Arc::new(Mutex::new(0)),
        }
    }
    
    /// 启动数据处理线程
    /// 
    /// 创建一个后台线程持续处理原始数据队列中的数据，
    /// 包括ECG处理、LTTB压缩、体温滤波等操作。
    pub fn start(&self) {
        self.is_running.store(true, Ordering::Relaxed);
        
        // 克隆所有需要在线程中使用的Arc引用
        let raw_queue = self.raw_data_queue.clone();
        let processed_queue = self.processed_data_queue.clone();
        let ecg_state = self.ecg_state.clone();
        let temp_state = self.temp_state.clone();
        let lttb_state = self.lttb_state.clone();
        let lttb_config = self.lttb_config.clone();
        let is_running = self.is_running.clone();
        let total_processed = self.total_processed.clone();
        
        thread::spawn(move || {
            println!("[DataProcessor] 数据处理线程已启动（包含LTTB压缩算法）");
            let mut consecutive_empty_count = 0;
            let mut last_performance_log = Instant::now();
            
            while is_running.load(Ordering::Relaxed) {
                // 从原始数据队列获取数据
                let raw_data = {
                    let mut queue = raw_queue.lock().unwrap();
                    queue.pop_front()
                };
                
                if let Some(vital_signs) = raw_data {
                    consecutive_empty_count = 0;
                    
                    // 处理数据（包含LTTB压缩）
                    let processed = Self::process_vital_signs(
                        vital_signs,
                        &ecg_state,
                        &temp_state,
                        &lttb_state,
                        &lttb_config
                    );
                    
                    // 更新处理计数
                    {
                        let mut count = total_processed.lock().unwrap();
                        *count += 1;
                    }
                    
                    // 定期输出性能信息（每5秒一次）
                    if last_performance_log.elapsed() >= Duration::from_secs(5) {
                        let count = *total_processed.lock().unwrap();
                        let lttb_state_guard = lttb_state.lock().unwrap();
                        println!("[DataProcessor] 性能统计: 已处理{}个数据点, LTTB缓冲区:{}/{}, 压缩数据点:{}", 
                                 count,
                                 lttb_state_guard.raw_buffer.len(),
                                 lttb_state_guard.buffer_size,
                                 lttb_state_guard.compressed_buffer.len());
                        last_performance_log = Instant::now();
                    }
                    
                    // 输出处理后的数据到控制台（简化版）
                    if consecutive_empty_count == 0 { // 只在重新开始处理时输出
                        println!("[DataProcessor] ECG原始={}, 归一化={:.3}, 压缩点数={}, 体温={:.2}°C, 心率={:.1}bpm", 
                                 processed.ecg_raw,
                                 processed.ecg_normalized,
                                 processed.ecg_lttb_compressed.len(),
                                 processed.body_temperature, 
                                 processed.heart_rate);
                    }
                    
                    // 存储处理后的数据
                    let mut processed_queue = processed_queue.lock().unwrap();
                    if processed_queue.len() >= 1000 {
                        processed_queue.pop_front();
                    }
                    processed_queue.push_back(processed);
                } else {
                    consecutive_empty_count += 1;
                    // 动态调整休眠时间，避免过度占用CPU
                    let sleep_time = if consecutive_empty_count < 10 {
                        Duration::from_millis(50)  // 短期无数据，短暂休眠
                    } else {
                        Duration::from_millis(200) // 长期无数据，较长休眠
                    };
                    thread::sleep(sleep_time);
                }
            }
            
            println!("[DataProcessor] 数据处理线程已停止");
        });
    }
    
    /// 停止数据处理线程
    pub fn stop(&self) {
        self.is_running.store(false, Ordering::Relaxed);
    }
    
    /// 获取最新的处理后数据
    /// 
    /// # 参数
    /// * `count` - 要获取的数据点数量
    /// 
    /// # 返回值
    /// 返回最新的处理后数据向量，按时间倒序排列
    pub fn get_processed_data(&self, count: usize) -> Vec<ProcessedVitalSigns> {
        let queue = self.processed_data_queue.lock().unwrap();
        queue.iter().rev().take(count).cloned().collect()
    }
    
    /// 获取LTTB压缩后的ECG数据
    /// 
    /// # 返回值
    /// 返回当前LTTB压缩缓冲区中的所有数据点
    pub fn get_lttb_compressed_data(&self) -> Vec<LttbDataPoint> {
        let lttb_state = self.lttb_state.lock().unwrap();
        lttb_state.compressed_buffer.clone()
    }
    
    /// 获取ECG统计信息
    /// 
    /// # 返回值
    /// 返回包含心率、变异性等统计信息的结构
    pub fn get_ecg_statistics(&self) -> EcgStatistics {
        let ecg_state = self.ecg_state.lock().unwrap();
        let lttb_state = self.lttb_state.lock().unwrap();
        
        // 计算压缩效率
        let compression_efficiency = if lttb_state.compressed_buffer.len() > 0 {
            lttb_state.raw_buffer.len() as f64 / lttb_state.compressed_buffer.len() as f64
        } else {
            1.0
        };
        
        EcgStatistics {
            current_heart_rate: ecg_state.last_heart_rate,
            average_heart_rate: ecg_state.last_heart_rate, // 简化实现
            max_heart_rate: ecg_state.last_heart_rate,
            min_heart_rate: ecg_state.last_heart_rate,
            rr_variability: ecg_state.last_rr_interval,
            signal_quality: 85.0, // 模拟值
            compression_efficiency,
        }
    }
    
    /// 获取系统性能指标
    /// 
    /// # 返回值
    /// 返回包含处理速率、内存使用等性能指标的结构
    pub fn get_performance_metrics(&self) -> PerformanceMetrics {
        let total_processed = *self.total_processed.lock().unwrap();
        let elapsed_secs = self.start_time.elapsed().as_secs_f64();
        let processing_rate = if elapsed_secs > 0.0 {
            total_processed as f64 / elapsed_secs
        } else {
            0.0
        };
        
        let queue_length = self.processed_data_queue.lock().unwrap().len();
        let lttb_state = self.lttb_state.lock().unwrap();
        let compression_ratio_achieved = if lttb_state.compressed_buffer.len() > 0 {
            (1.0 - lttb_state.compressed_buffer.len() as f64 / lttb_state.raw_buffer.len() as f64) * 100.0
        } else {
            0.0
        };
        
        PerformanceMetrics {
            processing_rate,
            memory_usage: 0.0, // 需要系统调用获取实际值
            cpu_usage: 0.0,    // 需要系统调用获取实际值
            queue_length,
            compression_ratio_achieved,
        }
    }
    
    /// 处理单个体征数据点
    /// 
    /// 这是核心处理函数，集成了所有数据处理算法：
    /// - ECG数据的LTTB压缩和归一化
    /// - 体温数据的滤波和校准
    /// - 血氧数据的验证
    /// - 心率和RR间隔的计算
    /// 
    /// # 参数
    /// * `vital_signs` - 原始体征数据
    /// * `ecg_state` - ECG处理状态引用
    /// * `temp_state` - 体温处理状态引用
    /// * `lttb_state` - LTTB处理状态引用
    /// * `lttb_config` - LTTB配置参数引用
    /// 
    /// # 返回值
    /// 返回处理后的体征数据，包含所有计算结果和压缩数据
    fn process_vital_signs(
        vital_signs: VitalSigns,
        ecg_state: &Arc<Mutex<EcgProcessingState>>,
        temp_state: &Arc<Mutex<TemperatureProcessingState>>,
        lttb_state: &Arc<Mutex<LttbProcessingState>>,
        lttb_config: &LttbConfig
    ) -> ProcessedVitalSigns {
        // 生成时间戳
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        
        // 处理体温数据
        let body_temperature = Self::process_body_temperature(
            vital_signs.temp,
            temp_state
        );
        
        // 处理血氧数据
        let blood_oxygen = Self::process_blood_oxygen(vital_signs.spo2);
        
        // 处理心电数据（传统算法）
        let (heart_rate, rr_interval) = Self::process_ecg_data(
            vital_signs.ecg,
            ecg_state
        );
        
        // LTTB处理和归一化
        let (ecg_normalized, ecg_lttb_compressed) = Self::process_ecg_lttb(
            vital_signs.ecg,
            timestamp,
            lttb_state,
            lttb_config
        );
        
        ProcessedVitalSigns {
            ecg_raw: vital_signs.ecg,
            ecg_normalized,
            ecg_lttb_compressed,
            body_temperature,
            blood_oxygen,
            heart_rate,
            rr_interval,
            timestamp,
        }
    }
    
    /// ECG数据的LTTB压缩和归一化处理
    /// 
    /// 实现Largest Triangle Three Buckets算法进行数据压缩，
    /// 同时将ECG数据归一化到-1到1的范围。
    /// 
    /// # 参数
    /// * `ecg_value` - 原始ECG数据值
    /// * `timestamp` - 当前时间戳
    /// * `lttb_state` - LTTB处理状态引用
    /// * `lttb_config` - LTTB配置参数引用
    /// 
    /// # 返回值
    /// 返回元组：(归一化ECG值, 压缩后的数据点向量)
    fn process_ecg_lttb(
        ecg_value: i32,
        timestamp: u64,
        lttb_state: &Arc<Mutex<LttbProcessingState>>,
        lttb_config: &LttbConfig
    ) -> (f64, Vec<LttbDataPoint>) {
        let mut state = lttb_state.lock().unwrap();
    
        let ecg_f64 = ecg_value as f64;
    
        // 更新全局最大最小值（用于归一化）
        if ecg_f64 > state.global_max {
            state.global_max = ecg_f64;
        }
        if ecg_f64 < state.global_min {
            state.global_min = ecg_f64;
        }
    
        // 归一化到 -1 到 1 范围
        let ecg_normalized = if state.global_max != state.global_min {
            2.0 * (ecg_f64 - state.global_min) / (state.global_max - state.global_min) - 1.0
        } else {
            0.0
        };
    
        // 创建数据点并添加到原始缓冲区
        let data_point = LttbDataPoint {
            x: timestamp as f64,
            y: ecg_normalized,
        };
    
        state.raw_buffer.push(data_point);
        state.sample_counter += 1;
    
        // 检查是否需要重新计算范围
        if lttb_config.enable_dynamic_range && 
           state.sample_counter % lttb_config.range_update_interval == 0 {
            Self::recalculate_global_range(&mut state);
        }
    
        let compressed_data = if state.raw_buffer.len() >= state.buffer_size {
            let target_points = state.buffer_size / state.compression_ratio;
            // 用 block 临时作用域确保不可变引用提前结束
            let compressed = {
                Self::lttb_downsample(&state.raw_buffer, target_points)
            };
            // 这里 compressed 已经是新 Vec，不再引用 raw_buffer
            
            state.compressed_buffer = compressed.clone();
            
            // 修复借用冲突：先计算keep_size和drain范围
            let keep_size = state.buffer_size / 4;
            let buffer_len = state.raw_buffer.len();
            let drain_end = buffer_len - keep_size;
            state.raw_buffer.drain(0..drain_end);
    
            println!("[LTTB] 压缩完成: {} -> {} 数据点，压缩比: {:.1}:1", 
                state.buffer_size, target_points, 
                state.buffer_size as f64 / target_points as f64
            );
    
            compressed
        } else {
            state.compressed_buffer.clone()
        };
    
        (ecg_normalized, compressed_data)
    }
    
    /// LTTB降采样算法实现
    /// 
    /// 基于Largest Triangle Three Buckets算法的核心实现，
    /// 通过计算三角形面积来选择最具代表性的数据点。
    /// 
    /// # 参数
    /// * `data` - 输入数据点向量
    /// * `threshold` - 目标输出数据点数量
    /// 
    /// # 返回值
    /// 返回降采样后的数据点向量
    fn lttb_downsample(data: &[LttbDataPoint], threshold: usize) -> Vec<LttbDataPoint> {
        if data.len() <= threshold {
            return data.to_vec();
        }
        
        if threshold <= 2 {
            return vec![data[0].clone(), data[data.len() - 1].clone()];
        }
        
        let mut sampled = Vec::with_capacity(threshold);
        
        // 始终包含第一个点
        sampled.push(data[0].clone());
        
        // 计算桶大小
        let bucket_size = (data.len() - 2) as f64 / (threshold - 2) as f64;
        
        let mut a = 0; // 左侧点索引
        
        for i in 0..(threshold - 2) {
            // 计算当前桶的范围
            let avg_range_start = ((i + 1) as f64 * bucket_size).floor() as usize + 1;
            let avg_range_end = ((i + 2) as f64 * bucket_size).floor() as usize + 1;
            let avg_range_end = avg_range_end.min(data.len());
            
            // 计算下一个桶的平均点
            let mut avg_x = 0.0;
            let mut avg_y = 0.0;
            let avg_range_length = avg_range_end - avg_range_start;
            
            if avg_range_length > 0 {
                for j in avg_range_start..avg_range_end {
                    avg_x += data[j].x;
                    avg_y += data[j].y;
                }
                avg_x /= avg_range_length as f64;
                avg_y /= avg_range_length as f64;
            }
            
            // 在当前桶中找到形成最大三角形面积的点
            let range_offs = (i as f64 * bucket_size).floor() as usize + 1;
            let range_to = ((i + 1) as f64 * bucket_size).floor() as usize + 1;
            
            let point_a_x = data[a].x;
            let point_a_y = data[a].y;
            
            let mut max_area = -1.0;
            let mut next_a = range_offs;
            
            for idx in range_offs..range_to.min(data.len()) {
                // 计算三角形面积
                let area = ((point_a_x * (data[idx].y - avg_y) + 
                           data[idx].x * (avg_y - point_a_y) + 
                           avg_x * (point_a_y - data[idx].y)) / 2.0).abs();
                
                if area > max_area {
                    max_area = area;
                    next_a = idx;
                }
            }
            
            sampled.push(data[next_a].clone());
            a = next_a;
        }
        
        // 始终包含最后一个点
        sampled.push(data[data.len() - 1].clone());
        
        sampled
    }
    
    /// 重新计算全局范围
    /// 
    /// 定期重新计算ECG数据的全局最大最小值，
    /// 以适应信号幅度的变化。
    /// 
    /// # 参数
    /// * `state` - LTTB处理状态的可变引用
    fn recalculate_global_range(state: &mut LttbProcessingState) {
        if state.raw_buffer.is_empty() {
            return;
        }
        
        let mut new_min = f64::INFINITY;
        let mut new_max = f64::NEG_INFINITY;
        
        // 只考虑最近的数据点来计算范围
        let recent_data_size = state.raw_buffer.len().min(500);
        let start_idx = state.raw_buffer.len() - recent_data_size;
        
        for point in &state.raw_buffer[start_idx..] {
            let original_value = (point.y + 1.0) / 2.0 * (state.global_max - state.global_min) + state.global_min;
            if original_value > new_max {
                new_max = original_value;
            }
            if original_value < new_min {
                new_min = original_value;
            }
        }
        
        // 平滑更新范围，避免剧烈变化
        let alpha = 0.1; // 平滑因子
        state.global_max = state.global_max * (1.0 - alpha) + new_max * alpha;
        state.global_min = state.global_min * (1.0 - alpha) + new_min * alpha;
        
        println!("[LTTB] 动态范围更新: [{:.2}, {:.2}]", state.global_min, state.global_max);
    }
    
    /// 处理体温数据
    /// 
    /// 基于原有Python逻辑实现的体温数据处理，包括：
    /// - 原始数据转换和校准
    /// - 异常值检测和处理
    /// - 滑动窗口滤波
    /// - 统计滤波（去除极值）
    /// 
    /// # 参数
    /// * `raw_temp` - 原始体温数据
    /// * `temp_state` - 体温处理状态引用
    /// 
    /// # 返回值
    /// 返回处理后的体温值（摄氏度）
    fn process_body_temperature(
        raw_temp: i32,
        temp_state: &Arc<Mutex<TemperatureProcessingState>>
    ) -> f64 {
        let mut state = temp_state.lock().unwrap();
        
        // 转换原始温度值（假设原始值需要除以10）
        let raw_temp_value = raw_temp as f64 / 10.0;
        let temp_value = raw_temp_value * state.scale_factor + state.offset;
        
        // 异常值检测：如果温度值异常低，可能是传感器问题
        let adjusted_temp = if temp_value < state.room_temperature - 10.0 {
            println!("[DataProcessor] 检测到异常低温度值 {:.2}°C，使用室温 {:.2}°C 作为基准", 
                     temp_value, state.room_temperature);
            state.room_temperature
        } else {
            temp_value
        };
        
        // 添加到温度历史列表
        state.temperatures.push(adjusted_temp);
        
        // 维护固定大小的滑动窗口（70个数据点）
        if state.temperatures.len() > 70 {
            state.temperatures.remove(0);
        }
        
        // 当达到足够数据点时，进行统计滤波
        if state.temperatures.len() == 70 {
            let mut sorted_temps = state.temperatures.clone();
            sorted_temps.sort_by(|a, b| a.partial_cmp(b).unwrap());
            
            // 去除最大和最小的10个点，减少极值影响
            if sorted_temps.len() >= 20 {
                let trimmed_temps = &sorted_temps[10..sorted_temps.len()-10];
                let average_temp: f64 = trimmed_temps.iter().sum::<f64>() / trimmed_temps.len() as f64;
                
                // 清空历史数据，准备下一轮统计
                state.temperatures.clear();
                
                // 应用最大温度限制
                if average_temp > state.max_temp {
                    state.max_temp
                } else {
                    average_temp
                }
            } else {
                adjusted_temp
            }
        } else {
            adjusted_temp
        }
    }
    
    /// 处理血氧数据
    /// 
    /// 简单的血氧数据验证和处理。
    /// 
    /// # 参数
    /// * `raw_spo2` - 原始血氧数据
    /// 
    /// # 返回值
    /// 返回处理后的血氧值（百分比）
    fn process_blood_oxygen(raw_spo2: i32) -> i32 {
        // 简单的数据验证：小于1的值视为无效
        if raw_spo2 < 1 {
            0
        } else {
            raw_spo2
        }
    }
    
    /// 处理ECG数据（传统算法）
    /// 
    /// 实现基于滑动窗口的R波检测算法，包括：
    /// - 动态阈值更新
    /// - 3点滑动窗口波峰检测
    /// - 心率和RR间隔计算
    /// - 数据缓冲区管理
    /// 
    /// # 参数
    /// * `ecg_value` - 当前ECG数据值
    /// * `ecg_state` - ECG处理状态引用
    /// 
    /// # 返回值
    /// 返回元组：(心率, RR间隔)
    fn process_ecg_data(
        ecg_value: i32,
        ecg_state: &Arc<Mutex<EcgProcessingState>>
    ) -> (f64, f64) {
        let mut state = ecg_state.lock().unwrap();
    
        // 添加到原始数据列表
        state.ecg_data_original_list.push(ecg_value);
        let ecg_value_f64 = ecg_value as f64;
    
        // 更新动态最大最小值（用于阈值计算）
        if ecg_value_f64 > state.ecg_point_max_new {
            state.ecg_point_max_new = ecg_value_f64;
        }
        if ecg_value_f64 < state.ecg_point_min_new {
            state.ecg_point_min_new = ecg_value_f64;
        }
    
        // 每300个数据点更新一次全局阈值
        state.counter += 1;
        if state.counter >= 300 {
            state.ecg_point_max = state.ecg_point_max_new;
            state.ecg_point_min = state.ecg_point_min_new;
            state.ecg_point_max_new = 0.0;
            state.ecg_point_min_new = f64::INFINITY;
            state.counter = 0;
        }
    
        // 3点滑动窗口波峰检测
        if state.ecg_points.len() < 3 {
            state.ecg_points.push_back(ecg_value);
        } else {
            state.ecg_points.pop_front();
            state.ecg_points.push_back(ecg_value);
    
            if state.ecg_points.len() == 3 {
                let points: Vec<i32> = state.ecg_points.iter().cloned().collect();
                let peak_detection_threshold = 0.6; // 波峰检测阈值
                
                // 检测波峰：中间点大于两侧点
                if points[0] < points[1] && points[1] > points[2] {
                    let threshold_value = (state.ecg_point_max - state.ecg_point_min) * peak_detection_threshold;
                    
                    // 检查波峰是否超过动态阈值
                    if (points[1] as f64 - state.ecg_point_min) > threshold_value {
                        if state.peak_interval_num != 0 {
                            // 计算心率（基于250Hz采样率）
                            let mut heart_rate = 60.0 / (1.0 / 250.0 * state.peak_interval_num as f64);
                            
                            // 心率限制（防止异常值）
                            if heart_rate > 100.0 { 
                                heart_rate = 100.0; 
                            }
                            
                            // 计算RR间隔
                            let rr_interval = 60.0 / heart_rate;
                            
                            // 更新状态
                            state.last_heart_rate = heart_rate;
                            state.last_rr_interval = rr_interval;
                            state.peak_interval_num = 0;
                        }
                    } else {
                        state.peak_interval_num += 1;
                    }
                } else {
                    state.peak_interval_num += 1;
                }
            }
        }
    
        // 管理原始数据缓冲区大小
        if state.ecg_data_original_list.len() >= 250 {
            state.ecg_data_original_list.clear();
        }
    
        // 返回最近一次检测到的有效心率和RR间期
        (state.last_heart_rate, state.last_rr_interval)
    }
}