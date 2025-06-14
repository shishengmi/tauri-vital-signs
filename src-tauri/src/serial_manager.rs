use crate::serial_reader::SerialReader;
use crate::test_reader::TestReader;
use crate::types::{DataQueue, DataSourceType, SerialConfig, SerialStatus, VitalSigns};
use serialport::SerialPortType;
use std::collections::VecDeque;
use std::sync::{Arc, Mutex};

/// 串口管理器结构体
pub struct SerialManager {
    /// 当前串口读取器
    reader: Option<SerialReader>,
    /// 测试数据生成器
    test_reader: Option<TestReader>,
    /// 数据队列
    data_queue: DataQueue,
    /// 串口状态
    status: Arc<Mutex<SerialStatus>>,
    /// 当前数据源类型
    data_source_type: Arc<Mutex<DataSourceType>>,
}

impl SerialManager {
    /// 创建新的串口管理器实例
    pub fn new() -> Self {
        Self {
            reader: None,
            test_reader: None,
            data_queue: Arc::new(Mutex::new(VecDeque::with_capacity(1000))),
            status: Arc::new(Mutex::new(SerialStatus::Disconnected)),
            data_source_type: Arc::new(Mutex::new(DataSourceType::RealSerial)),
        }
    }

    /// 获取可用串口列表
    pub fn get_available_ports() -> Vec<(String, String)> {
        serialport::available_ports()
            .unwrap_or_default()
            .into_iter()
            .filter_map(|p| {
                let port_name = p.port_name;
                let port_type = match p.port_type {
                    SerialPortType::UsbPort(info) => {
                        format!("USB设备 (VID:{:04x} PID:{:04x})", info.vid, info.pid)
                    }
                    SerialPortType::PciPort => "PCI设备".to_string(),
                    SerialPortType::BluetoothPort => "蓝牙设备".to_string(),
                    SerialPortType::Unknown => "未知设备".to_string(),
                };
                Some((port_name, port_type))
            })
            .collect()
    }

    /// 测试串口连接
    pub fn test_connection(&self, config: SerialConfig) -> Result<(), String> {
        let reader = SerialReader::new(config.clone(), self.data_queue.clone());
        reader.test_connection()
    }

    /// 发送数据到串口
    pub fn send_data(&self, data: String) -> Result<(), String> {
        if let Some(reader) = &self.reader {
            reader.send_data(&data)
        } else {
            Err("串口未连接".to_string())
        }
    }

    /// 连接到指定串口
    pub fn connect(&mut self, config: SerialConfig) -> Result<(), String> {
        // 先断开现有连接
        self.disconnect();

        // 根据数据源类型选择连接方式
        match self.get_data_source_type() {
            DataSourceType::RealSerial => {
                // 创建新的串口读取器
                let reader = SerialReader::new(config.clone(), self.data_queue.clone());
                
                // 启动串口读取
                reader.start()?;
                
                // 更新状态
                *self.status.lock().unwrap() = SerialStatus::Connected(config.port_name.clone());
                self.reader = Some(reader);
            },
            DataSourceType::TestSimulation => {
                // 创建测试数据生成器
                let test_reader = TestReader::new(self.data_queue.clone());
                
                // 启动测试数据生成
                test_reader.start()?;
                
                // 更新状态
                *self.status.lock().unwrap() = SerialStatus::Connected("TEST_MODE".to_string());
                self.test_reader = Some(test_reader);
            }
        }
        
        Ok(())
    }

    /// 断开当前串口连接
    pub fn disconnect(&mut self) {
        // 停止串口读取器
        if let Some(reader) = self.reader.take() {
            reader.stop();
        }
        
        // 停止测试数据生成器
        if let Some(test_reader) = self.test_reader.take() {
            test_reader.stop();
        }
        
        *self.status.lock().unwrap() = SerialStatus::Disconnected;
    }

    /// 获取最新的N组数据
    pub fn get_latest_data(&self, count: usize) -> Vec<VitalSigns> {
        let queue = self.data_queue.lock().unwrap();
        queue.iter().rev().take(count).cloned().collect()
    }

    /// 获取当前串口状态
    pub fn get_status(&self) -> SerialStatus {
        self.status.lock().unwrap().clone()
    }

    /// 获取数据队列的引用 - 新增方法
    pub fn get_data_queue(&self) -> DataQueue {
        self.data_queue.clone()
    }

    /// 设置数据源类型
    pub fn set_data_source_type(&mut self, source_type: DataSourceType) {
        println!("[SerialManager] 数据源类型已设置为: {:?}", source_type);
        *self.data_source_type.lock().unwrap() = source_type;
    }
    
    /// 获取当前数据源类型
    pub fn get_data_source_type(&self) -> DataSourceType {
        self.data_source_type.lock().unwrap().clone()
    }
}

// 为了线程安全实现必要的特征
unsafe impl Send for SerialManager {}
