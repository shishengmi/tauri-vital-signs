#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod serial_manager;
mod serial_reader;
mod types;
mod data_processor; // 新增

use serial_manager::SerialManager;
use data_processor::DataProcessor; // 新增
use std::sync::Mutex;
use tauri::State;
use types::{SerialConfig, SerialStatus, VitalSigns, ProcessedVitalSigns}; // 更新

/// 全局串口管理器状态
struct SerialManagerState(Mutex<SerialManager>);

/// 全局数据处理器状态
struct DataProcessorState(Mutex<Option<DataProcessor>>); // 新增

/// 获取可用串口列表
#[tauri::command]
fn get_available_ports() -> Vec<(String, String)> {
    SerialManager::get_available_ports()
}

/// 测试串口连接
#[tauri::command]
fn test_serial_connection(
    port_name: String,
    baud_rate: u32,
    state: State<SerialManagerState>,
) -> Result<(), String> {
    let config = SerialConfig {
        port_name,
        baud_rate,
    };
    state.0.lock().unwrap().test_connection(config)
}

/// 连接串口
#[tauri::command]
fn connect_serial(
    port_name: String,
    baud_rate: u32,
    serial_state: State<SerialManagerState>,
    processor_state: State<DataProcessorState>,
) -> Result<(), String> {
    let config = SerialConfig {
        port_name,
        baud_rate,
    };
    
    // 连接串口
    serial_state.0.lock().unwrap().connect(config)?;
    
    // 自动启动数据处理
    let serial_manager = serial_state.0.lock().unwrap();
    let data_queue = serial_manager.get_data_queue();
    drop(serial_manager); // 释放锁
    
    let processor = DataProcessor::new(data_queue);
    processor.start();
    
    let mut processor_guard = processor_state.0.lock().unwrap();
    *processor_guard = Some(processor);
    
    println!("[Main] 串口连接成功，数据处理已自动启动");
    Ok(())
}

/// 断开串口连接
#[tauri::command]
fn disconnect_serial(
    serial_state: State<SerialManagerState>,
    processor_state: State<DataProcessorState>,
) {
    // 停止数据处理
    let mut processor_guard = processor_state.0.lock().unwrap();
    if let Some(processor) = processor_guard.as_ref() {
        processor.stop();
        println!("[Main] 数据处理已停止");
    }
    *processor_guard = None;
    drop(processor_guard);
    
    // 断开串口连接
    serial_state.0.lock().unwrap().disconnect();
    println!("[Main] 串口连接已断开");
}

/// 发送数据到串口
#[tauri::command]
fn send_serial_data(data: String, state: State<SerialManagerState>) -> Result<(), String> {
    state.0.lock().unwrap().send_data(data)
}

/// 获取最新的N组数据
#[tauri::command]
fn get_latest_data(count: usize, state: State<SerialManagerState>) -> Vec<VitalSigns> {
    state.0.lock().unwrap().get_latest_data(count)
}

/// 获取当前串口状态
#[tauri::command]
fn get_serial_status(state: State<SerialManagerState>) -> SerialStatus {
    state.0.lock().unwrap().get_status()
}

/// 获取处理后的最新数据
#[tauri::command]
fn get_processed_data(count: usize, state: State<DataProcessorState>) -> Vec<ProcessedVitalSigns> {
    let processor_guard = state.0.lock().unwrap();
    if let Some(processor) = processor_guard.as_ref() {
        processor.get_processed_data(count)
    } else {
        Vec::new()
    }
}

/// 启动数据处理
#[tauri::command]
fn start_data_processing(
    serial_state: State<SerialManagerState>,
    processor_state: State<DataProcessorState>
) -> Result<(), String> {
    let serial_manager = serial_state.0.lock().unwrap();
    let data_queue = serial_manager.get_data_queue(); // 需要在SerialManager中添加此方法
    
    let processor = DataProcessor::new(data_queue);
    processor.start();
    
    let mut processor_guard = processor_state.0.lock().unwrap();
    *processor_guard = Some(processor);
    
    Ok(())
}

/// 停止数据处理
#[tauri::command]
fn stop_data_processing(state: State<DataProcessorState>) {
    let mut processor_guard = state.0.lock().unwrap();
    if let Some(processor) = processor_guard.as_ref() {
        processor.stop();
    }
    *processor_guard = None;
}

fn main() {
    // 初始化串口管理器
    let serial_manager = SerialManager::new();

    tauri::Builder::default()
        .manage(SerialManagerState(Mutex::new(serial_manager)))
        .manage(DataProcessorState(Mutex::new(None))) // 新增
        .invoke_handler(tauri::generate_handler![
            get_available_ports,
            test_serial_connection,
            connect_serial,
            disconnect_serial,
            send_serial_data,
            get_latest_data,
            get_serial_status,
            get_processed_data,      // 新增
            start_data_processing,   // 新增
            stop_data_processing     // 新增
        ])
        .run(tauri::generate_context!())
        .expect("Tauri应用运行错误");
}
