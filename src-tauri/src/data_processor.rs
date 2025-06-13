use crate::types::{
    VitalSigns, ProcessedVitalSigns, EcgProcessingState, TemperatureProcessingState,
    DataQueue, ProcessedDataQueue
};
use std::collections::VecDeque;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use std::thread;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

pub struct DataProcessor {
    raw_data_queue: DataQueue,
    processed_data_queue: ProcessedDataQueue,
    ecg_state: Arc<Mutex<EcgProcessingState>>,
    temp_state: Arc<Mutex<TemperatureProcessingState>>,
    is_running: Arc<AtomicBool>,
}

impl DataProcessor {
    pub fn new(raw_data_queue: DataQueue) -> Self {
        let processed_data_queue = Arc::new(Mutex::new(VecDeque::with_capacity(1000)));
        
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
        
        let temp_state = Arc::new(Mutex::new(TemperatureProcessingState {
            temperatures: Vec::with_capacity(70),
            scale_factor: 0.8,
            offset: 0.0,
            max_temp: 37.2,
            room_temperature: 23.2,
        }));
        
        Self {
            raw_data_queue,
            processed_data_queue,
            ecg_state,
            temp_state,
            is_running: Arc::new(AtomicBool::new(false)),
        }
    }
    
    pub fn start(&self) {
        self.is_running.store(true, Ordering::Relaxed);
        
        // 启动数据处理线程
        let raw_queue = self.raw_data_queue.clone();
        let processed_queue = self.processed_data_queue.clone();
        let ecg_state = self.ecg_state.clone();
        let temp_state = self.temp_state.clone();
        let is_running = self.is_running.clone();
        
        thread::spawn(move || {
            println!("[DataProcessor] 数据处理线程已启动");
            let mut consecutive_empty_count = 0;
            
            while is_running.load(Ordering::Relaxed) {
                // 从原始数据队列获取数据
                let raw_data = {
                    let mut queue = raw_queue.lock().unwrap();
                    queue.pop_front()
                };
                
                if let Some(vital_signs) = raw_data {
                    consecutive_empty_count = 0;
                    
                    // 处理数据
                    let processed = Self::process_vital_signs(
                        vital_signs,
                        &ecg_state,
                        &temp_state
                    );
                    
                    // 输出处理后的数据到控制台
                    println!("[DataProcessor] 处理后数据: ECG原始={}, 体温={:.2}°C, 血氧={}%, 心率={:.1}bpm, RR间隔={:.3}s", 
                             processed.ecg_raw,
                             processed.body_temperature, 
                             processed.blood_oxygen, 
                             processed.heart_rate, 
                             processed.rr_interval);
                    
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
    
    pub fn stop(&self) {
        self.is_running.store(false, Ordering::Relaxed);
    }
    
    pub fn get_processed_data(&self, count: usize) -> Vec<ProcessedVitalSigns> {
        let queue = self.processed_data_queue.lock().unwrap();
        queue.iter().rev().take(count).cloned().collect()
    }
    
    fn process_vital_signs(
        vital_signs: VitalSigns,
        ecg_state: &Arc<Mutex<EcgProcessingState>>,
        temp_state: &Arc<Mutex<TemperatureProcessingState>>
    ) -> ProcessedVitalSigns {
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
        
        // 处理心电数据
        let (heart_rate, rr_interval) = Self::process_ecg_data(
            vital_signs.ecg,
            ecg_state
        );
        
        ProcessedVitalSigns {
            ecg_raw: vital_signs.ecg,
            body_temperature,
            blood_oxygen,
            heart_rate,
            rr_interval,
            timestamp,
        }
    }
    
    /// 处理体温数据 - 基于Python逻辑
    fn process_body_temperature(
        raw_temp: i32,
        temp_state: &Arc<Mutex<TemperatureProcessingState>>
    ) -> f64 {
        let mut state = temp_state.lock().unwrap();
        
        // 转换原始温度值
        let raw_temp_value = raw_temp as f64 / 10.0;
        let temp_value = raw_temp_value * state.scale_factor + state.offset;
        
        // 如果温度值异常低，可能是传感器问题，使用室温作为基准
        let adjusted_temp = if temp_value < state.room_temperature - 10.0 {
            println!("[DataProcessor] 检测到异常低温度值 {:.2}°C，使用室温 {:.2}°C 作为基准", 
                     temp_value, state.room_temperature);
            state.room_temperature
        } else {
            temp_value
        };
        
        // 添加到温度列表
        state.temperatures.push(adjusted_temp);
        
        // 只保留最近70个数据点
        if state.temperatures.len() > 70 {
            state.temperatures.remove(0);
        }
        
        // 如果达到70个数据点，计算平均值
        if state.temperatures.len() == 70 {
            let mut sorted_temps = state.temperatures.clone();
            sorted_temps.sort_by(|a, b| a.partial_cmp(b).unwrap());
            
            // 舍弃最大和最小的10个点
            if sorted_temps.len() >= 20 {
                let trimmed_temps = &sorted_temps[10..sorted_temps.len()-10];
                let average_temp: f64 = trimmed_temps.iter().sum::<f64>() / trimmed_temps.len() as f64;
                
                state.temperatures.clear();
                
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
    
    /// 处理血氧数据 - 基于Python逻辑
    fn process_blood_oxygen(raw_spo2: i32) -> i32 {
        if raw_spo2 < 1 {
            0
        } else {
            raw_spo2
        }
    }
    
    fn process_ecg_data(
        ecg_value: i32,
        ecg_state: &Arc<Mutex<EcgProcessingState>>
    ) -> (f64, f64) {
        let mut state = ecg_state.lock().unwrap();
    
        state.ecg_data_original_list.push(ecg_value);
        let ecg_value_f64 = ecg_value as f64;
    
        if ecg_value_f64 > state.ecg_point_max_new {
            state.ecg_point_max_new = ecg_value_f64;
        }
        if ecg_value_f64 < state.ecg_point_min_new {
            state.ecg_point_min_new = ecg_value_f64;
        }
    
        state.counter += 1;
        if state.counter >= 300 {
            state.ecg_point_max = state.ecg_point_max_new;
            state.ecg_point_min = state.ecg_point_min_new;
            state.ecg_point_max_new = 0.0;
            state.ecg_point_min_new = f64::INFINITY;
            state.counter = 0;
        }
    
        // 波峰检测
        if state.ecg_points.len() < 3 {
            state.ecg_points.push_back(ecg_value);
        } else {
            state.ecg_points.pop_front();
            state.ecg_points.push_back(ecg_value);
    
            if state.ecg_points.len() == 3 {
                let points: Vec<i32> = state.ecg_points.iter().cloned().collect();
                let peak_detection_threshold = 0.6;
                if points[0] < points[1] && points[1] > points[2] {
                    let threshold_value = (state.ecg_point_max - state.ecg_point_min) * peak_detection_threshold;
                    if (points[1] as f64 - state.ecg_point_min) > threshold_value {
                        if state.peak_interval_num != 0 {
                            // 检测到波峰，计算心率并**更新缓存**
                            let mut heart_rate = 60.0 / (1.0 / 250.0 * state.peak_interval_num as f64);
                            if heart_rate > 100.0 { heart_rate = 100.0; }
                            let rr_interval = 1.0 / heart_rate;
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
    
        if state.ecg_data_original_list.len() >= 250 {
            state.ecg_data_original_list.clear();
        }
    
        // **始终返回最近一次检测到的有效心率和rr间期**
        (state.last_heart_rate, state.last_rr_interval)
    }
    
}