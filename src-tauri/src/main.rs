#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod serial_manager;
mod serial_reader;
mod types;

use serial_manager::SerialManager;
use std::sync::Mutex;
use tauri::State;
use types::{SerialConfig, SerialStatus, VitalSigns};

/// 全局串口管理器状态
struct SerialManagerState(Mutex<SerialManager>);

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
    state: State<SerialManagerState>,
) -> Result<(), String> {
    let config = SerialConfig {
        port_name,
        baud_rate,
    };
    state.0.lock().unwrap().connect(config)
}

/// 断开串口连接
#[tauri::command]
fn disconnect_serial(state: State<SerialManagerState>) {
    state.0.lock().unwrap().disconnect();
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

fn main() {
    // 初始化串口管理器
    let serial_manager = SerialManager::new();

    tauri::Builder::default()
        .manage(SerialManagerState(Mutex::new(serial_manager)))
        .invoke_handler(tauri::generate_handler![
            get_available_ports,
            test_serial_connection,
            connect_serial,
            disconnect_serial,
            send_serial_data,
            get_latest_data,
            get_serial_status
        ])
        .run(tauri::generate_context!())
        .expect("Tauri应用运行错误");
}
