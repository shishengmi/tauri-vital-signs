//! 串口通信库

/// 为类型实现 Send 特征的宏
#[macro_export]
macro_rules! undefined_Send_for_SerialManager {
    () => {
        unsafe impl Send for SerialManager {}
    };
}

// 导出模块
pub mod data_processor;
pub mod patient_store;
pub mod serial_manager;
pub mod serial_reader;
pub mod test_reader;
pub mod types; // 新增患者存储模块
