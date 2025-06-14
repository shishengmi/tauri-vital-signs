use crate::types::{DataQueue, SerialConfig, VitalSigns};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use std::thread;
use rand::Rng;

pub struct TestReader {
    config: SerialConfig,
    data_queue: DataQueue,
    stop_flag: Arc<AtomicBool>,
}

impl TestReader {
    pub fn new(config: SerialConfig, data_queue: DataQueue) -> Self {
        println!("[TestReader] 初始化测试数据生成器");
        Self {
            config,
            data_queue,
            stop_flag: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn test_connection(&self) -> Result<(), String> {
        println!("[TestReader] 测试连接 (模拟模式)");
        Ok(())
    }

    pub fn send_data(&self, data: &str) -> Result<(), String> {
        println!("[TestReader] 模拟发送数据: {}", data);
        Ok(())
    }

    // 生成模拟的生命体征数据
    fn generate_test_data() -> VitalSigns {
        let mut rng = rand::thread_rng();
        
        // 模拟心电数据 - 生成类似正弦波的数据
        let time = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as f64 / 1000.0;
        
        // 基础正弦波 + 随机噪声
        let ecg_base = (time * 5.0).sin() * 500.0;
        let ecg_noise = rng.gen_range(-50.0..50.0);
        let ecg = (ecg_base + ecg_noise) as i32;
        
        // 血氧饱和度 - 正常范围95-100
        let spo2 = rng.gen_range(95..101);
        
        // 体温 - 正常范围36-37.5摄氏度，转换为整数表示
        let temp_float = rng.gen_range(36.0..37.5);
        let temp = (temp_float * 10.0) as i32;
        
        // 血压数据 - 收缩压(高压)和舒张压(低压)
        let systolic = rng.gen_range(110..140);
        let diastolic = rng.gen_range(70..90);
        
        VitalSigns {
            ecg,
            spo2,
            temp,
            systolic,
            diastolic,
        }
    }

    pub fn start(&self) -> Result<(), String> {
        println!("[TestReader] 启动测试数据生成线程");
        
        let stop_flag = self.stop_flag.clone();
        let data_queue = self.data_queue.clone();
        
        thread::spawn(move || {
            println!("[TestReader][线程] 测试数据生成线程已启动");
            
            while !stop_flag.load(Ordering::Relaxed) {
                // 生成测试数据
                let vital_signs = Self::generate_test_data();
                
                // 将数据添加到队列
                let mut queue = data_queue.lock().unwrap();
                if queue.len() >= 1000 {
                    queue.pop_front();
                }
                queue.push_back(vital_signs);
                
                // 控制数据生成频率
                thread::sleep(Duration::from_millis(100)); // 每100ms生成一条数据
            }
            
            println!("[TestReader][线程] 测试数据生成线程安全退出");
        });
        
        Ok(())
    }

    pub fn stop(&self) {
        println!("[TestReader] 停止测试数据生成");
        self.stop_flag.store(true, Ordering::Relaxed);
    }
}