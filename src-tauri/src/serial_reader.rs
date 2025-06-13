use crate::types::{DataQueue, SerialConfig, VitalSigns};
use std::io::{BufRead, BufReader, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;

/// 串口读取器结构体
pub struct SerialReader {
    /// 串口配置
    config: SerialConfig,
    /// 数据队列
    data_queue: DataQueue,
    /// 停止标志
    stop_flag: Arc<AtomicBool>,
}

impl SerialReader {
    /// 创建新的串口读取器实例
    pub fn new(config: SerialConfig, data_queue: DataQueue) -> Self {
        Self {
            config,
            data_queue,
            stop_flag: Arc::new(AtomicBool::new(false)),
        }
    }

    /// 测试串口连接
    pub fn test_connection(&self) -> Result<(), String> {
        // 尝试打开串口但不启动读取
        serialport::new(&self.config.port_name, self.config.baud_rate)
            .timeout(Duration::from_millis(1000))
            .open()
            .map_err(|e| format!("无法打开串口: {}", e))?;

        Ok(())
    }

    /// 发送数据到串口
    pub fn send_data(&self, data: &str) -> Result<(), String> {
        let mut port = serialport::new(&self.config.port_name, self.config.baud_rate)
            .timeout(Duration::from_millis(1000))
            .open()
            .map_err(|e| format!("无法打开串口: {}", e))?;

        port.write_all(data.as_bytes())
            .map_err(|e| format!("发送数据失败: {}", e))?;

        Ok(())
    }

    /// 解析串口数据行
    fn parse_data_line(line: &str) -> Option<VitalSigns> {
        let mut ecg = None;
        let mut spo2 = None;
        let mut temp = None;

        // 解析形如 "A=xxx,B=yyy,C=zzz" 的数据行
        for part in line.split(',') {
            let kv: Vec<&str> = part.split('=').collect();
            if kv.len() != 2 {
                continue;
            }

            match kv[0].trim() {
                "A" => ecg = kv[1].trim().parse().ok(),
                "B" => spo2 = kv[1].trim().parse().ok(),
                "C" => temp = kv[1].trim().parse().ok(),
                _ => continue,
            }
        }

        // 只有当所有字段都解析成功时才返回数据
        if let (Some(ecg), Some(spo2), Some(temp)) = (ecg, spo2, temp) {
            Some(VitalSigns { ecg, spo2, temp })
        } else {
            None
        }
    }

    /// 启动串口读取线程
    pub fn start(&self) -> Result<(), String> {
        // 先测试连接
        self.test_connection()?;

        // 创建串口
        let port = serialport::new(&self.config.port_name, self.config.baud_rate)
            .timeout(Duration::from_millis(3000))
            .open()
            .map_err(|e| format!("无法打开串口: {}", e))?;

        let reader = BufReader::new(port);
        let stop_flag = self.stop_flag.clone();
        let data_queue = self.data_queue.clone();

        // 启动读取线程
        std::thread::spawn(move || {
            let mut line = String::new();
            let mut reader = reader;
            let mut consecutive_errors = 0;
            const MAX_CONSECUTIVE_ERRORS: u32 = 5;

            while !stop_flag.load(Ordering::Relaxed) {
                line.clear();
                match reader.read_line(&mut line) {
                    Ok(0) => break, // EOF
                    Ok(_) => {
                        consecutive_errors = 0; // 重置错误计数
                        if let Some(vital_signs) = Self::parse_data_line(&line) {
                            let mut queue = data_queue.lock().unwrap();
                            if queue.len() >= 1000 {
                                queue.pop_front();
                            }
                            queue.push_back(vital_signs);
                        }
                    }
                    Err(e) => {
                        consecutive_errors += 1;
                        eprintln!("串口读取错误: {}", e);
                        
                        if consecutive_errors >= MAX_CONSECUTIVE_ERRORS {
                            eprintln!("连续发生{}次错误，退出读取线程", MAX_CONSECUTIVE_ERRORS);
                            break;
                        }
                        
                        // 短暂延时后继续尝试
                        std::thread::sleep(Duration::from_millis(1000));
                    }
                }
            }
        });

        Ok(())
    }

    /// 停止串口读取
    pub fn stop(&self) {
        self.stop_flag.store(true, Ordering::Relaxed);
    }
}