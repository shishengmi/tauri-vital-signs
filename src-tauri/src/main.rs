#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod data_processor;
mod patient_store;
mod serial_manager;
mod serial_reader;
mod test_reader;  // 新增
mod types;

use data_processor::DataProcessor;
use patient_store::{PatientInfo, PatientStore};
use serial_manager::SerialManager;
use std::sync::Mutex;
use tauri::{Manager, State}; // 添加 Manager 导入
use types::{DataSourceType, ProcessedVitalSigns, SerialConfig, SerialStatus, VitalSigns};

/// 全局串口管理器状态
struct SerialManagerState(Mutex<SerialManager>);

/// 全局数据处理器状态
struct DataProcessorState(Mutex<Option<DataProcessor>>);

/// 全局患者存储状态
struct PatientStoreState(Mutex<Option<PatientStore>>);

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
    processor_state: State<DataProcessorState>,
) -> Result<(), String> {
    let serial_manager = serial_state.0.lock().unwrap();
    let data_queue = serial_manager.get_data_queue();
    drop(serial_manager);

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

/// 保存患者信息
#[tauri::command]
fn save_patient_info(
    patient_info: PatientInfo,
    state: State<PatientStoreState>,
) -> Result<(), String> {
    let store_guard = state.0.lock().unwrap();
    if let Some(store) = store_guard.as_ref() {
        store.save_patient_info(&patient_info)
    } else {
        Err("患者存储未初始化".to_string())
    }
}

/// 加载患者信息
#[tauri::command]
fn load_patient_info(state: State<PatientStoreState>) -> Result<PatientInfo, String> {
    let store_guard = state.0.lock().unwrap();
    if let Some(store) = store_guard.as_ref() {
        store.load_patient_info()
    } else {
        Err("患者存储未初始化".to_string())
    }
}

/// 删除患者信息
#[tauri::command]
fn delete_patient_info(state: State<PatientStoreState>) -> Result<(), String> {
    let store_guard = state.0.lock().unwrap();
    if let Some(store) = store_guard.as_ref() {
        store.delete_patient_info()
    } else {
        Err("患者存储未初始化".to_string())
    }
}

/// 获取LTTB压缩后的ECG数据
#[tauri::command]
fn get_lttb_compressed_data(state: State<DataProcessorState>) -> Vec<types::LttbDataPoint> {
    let processor_guard = state.0.lock().unwrap();
    if let Some(processor) = processor_guard.as_ref() {
        processor.get_lttb_compressed_data()
    } else {
        Vec::new()
    }
}

#[tauri::command]
fn get_blood_pressure(state: State<SerialManagerState>) -> Result<(i32, i32), String> {
    let manager = state.0.lock().unwrap();
    let latest_data = manager.get_latest_data(1);
    
    if let Some(data) = latest_data.first() {
        Ok((data.systolic, data.diastolic))
    } else {
        Err("没有可用的血压数据".to_string())
    }
}


/// 设置数据源类型
#[tauri::command]
fn set_data_source_type(
    source_type: String,
    state: State<SerialManagerState>,
) -> Result<(), String> {
    let source_type = match source_type.as_str() {
        "real" => DataSourceType::RealSerial,
        "test" => DataSourceType::TestSimulation,
        _ => return Err("无效的数据源类型，请使用 'real' 或 'test'".to_string()),
    };
    
    let mut manager = state.0.lock().unwrap();
    manager.set_data_source_type(source_type);
    Ok(())
}

/// 获取当前数据源类型
#[tauri::command]
fn get_data_source_type(state: State<SerialManagerState>) -> String {
    let manager = state.0.lock().unwrap();
    match manager.get_data_source_type() {
        DataSourceType::RealSerial => "real".to_string(),
        DataSourceType::TestSimulation => "test".to_string(),
    }
}

fn main() {
    // 初始化串口管理器
    let serial_manager = SerialManager::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .manage(SerialManagerState(Mutex::new(serial_manager)))
        .manage(DataProcessorState(Mutex::new(None)))
        .manage(PatientStoreState(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            get_available_ports,
            test_serial_connection,
            connect_serial,
            disconnect_serial,
            send_serial_data,
            get_latest_data,
            get_serial_status,
            get_processed_data,
            get_lttb_compressed_data,
            start_data_processing,
            stop_data_processing,
            save_patient_info,
            load_patient_info,
            delete_patient_info,
            set_data_source_type,
            get_data_source_type,
            get_blood_pressure  // 添加新的API函数
        ])
        .setup(|app| {
            // 在 setup 中初始化 PatientStore，这时可以访问 AppHandle
            match PatientStore::new(app.handle()) {
                Ok(patient_store) => {
                    // 更新 state
                    let patient_store_state = app.state::<PatientStoreState>();
                    *patient_store_state.0.lock().unwrap() = Some(patient_store);
                    println!("[Main] 患者存储初始化成功");
                }
                Err(e) => {
                    eprintln!("[Main] 患者存储初始化失败: {}", e);
                    // 可以选择继续运行或者退出应用
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Tauri应用运行错误");
}
