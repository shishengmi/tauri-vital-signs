use crate::types::{DataQueue, SerialConfig, VitalSigns};
use std::io::{BufRead, BufReader, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;

pub struct SerialReader {
    config: SerialConfig,
    data_queue: DataQueue,
    stop_flag: Arc<AtomicBool>,
}

impl SerialReader {
    pub fn new(config: SerialConfig, data_queue: DataQueue) -> Self {
        println!(
            "[SerialReader] 初始化，串口={}, 波特率={}",
            config.port_name, config.baud_rate
        );
        Self {
            config,
            data_queue,
            stop_flag: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn test_connection(&self) -> Result<(), String> {
        println!("[SerialReader] 测试串口连接: {}", self.config.port_name);
        serialport::new(&self.config.port_name, self.config.baud_rate)
            .timeout(Duration::from_millis(1000))
            .open()
            .map_err(|e| format!("无法打开串口: {}", e))?;
        println!("[SerialReader] 串口连接正常");
        Ok(())
    }

    pub fn send_data(&self, data: &str) -> Result<(), String> {
        println!("[SerialReader] 向串口发送数据: {}", data);
        let mut port = serialport::new(&self.config.port_name, self.config.baud_rate)
            .timeout(Duration::from_millis(1000))
            .open()
            .map_err(|e| format!("无法打开串口: {}", e))?;

        port.write_all(data.as_bytes())
            .map_err(|e| format!("发送数据失败: {}", e))?;

        println!("[SerialReader] 数据发送完成");
        Ok(())
    }

    fn parse_data_line(line: &str) -> Option<VitalSigns> {
        let mut ecg = None;
        let mut spo2 = None;
        let mut temp = None;

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

        if let (Some(ecg), Some(spo2), Some(temp)) = (ecg, spo2, temp) {
            Some(VitalSigns { 
                ecg, 
                spo2, 
                temp, 
                systolic: 0, // 默认值为0
                diastolic: 0  // 默认值为0
            })
        } else {
            None
        }
    }

    pub fn start(&self) -> Result<(), String> {
        self.test_connection()?;

        println!(
            "[SerialReader] 启动串口读取线程: {}, 波特率={}",
            self.config.port_name, self.config.baud_rate
        );
        let port = serialport::new(&self.config.port_name, self.config.baud_rate)
            .timeout(Duration::from_millis(3000))
            .open()
            .map_err(|e| format!("无法打开串口: {}", e))?;

        let reader = BufReader::new(port);
        let stop_flag = self.stop_flag.clone();
        let data_queue = self.data_queue.clone();
        let port_name = self.config.port_name.clone();

        std::thread::spawn(move || {
            println!("[SerialReader][线程] 读取线程已启动，端口={}", port_name);
            let mut line = String::new();
            let mut reader = reader;
            let mut consecutive_errors = 0;
            const MAX_CONSECUTIVE_ERRORS: u32 = 5;

            while !stop_flag.load(Ordering::Relaxed) {
                line.clear();
                match reader.read_line(&mut line) {
                    Ok(0) => {
                        println!("[SerialReader][线程] 检测到串口 EOF，线程退出");
                        break;
                    }
                    Ok(_) => {
                        consecutive_errors = 0;
                        // print!("[SerialReader][线程] 原始数据行: {}", line.trim_end());
                        if let Some(vital_signs) = Self::parse_data_line(&line) {
                            // println!(" -> 解析成功: {:?}", vital_signs);
                            let mut queue = data_queue.lock().unwrap();
                            if queue.len() >= 1000 {
                                // println!("[SerialReader][线程] 队列已满，移除最早数据");
                                queue.pop_front();
                            }
                            queue.push_back(vital_signs);
                            // println!("[SerialReader][线程] 当前队列长度: {}", queue.len());
                        } else {
                            println!(" -> 解析失败，无效数据行");
                        }
                    }
                    Err(e) => {
                        consecutive_errors += 1;
                        eprintln!(
                            "[SerialReader][线程] 串口读取错误: {} (连续错误: {})",
                            e, consecutive_errors
                        );
                        if consecutive_errors >= MAX_CONSECUTIVE_ERRORS {
                            eprintln!(
                                "[SerialReader][线程] 连续发生{}次错误，退出读取线程",
                                MAX_CONSECUTIVE_ERRORS
                            );
                            break;
                        }
                        std::thread::sleep(Duration::from_millis(1000));
                    }
                }
            }
            println!("[SerialReader][线程] 读取线程安全退出");
        });

        Ok(())
    }

    pub fn stop(&self) {
        println!("[SerialReader] 停止信号已发出");
        self.stop_flag.store(true, Ordering::Relaxed);
    }
}
