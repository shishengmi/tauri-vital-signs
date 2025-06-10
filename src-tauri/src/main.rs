#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use serde::{Deserialize};

#[derive(Debug, Deserialize)]
struct MessageContent {
    #[serde(rename = "type")]
    msg_type: String, // "text"
    text: String,
}

#[derive(Debug, Deserialize)]
struct Message {
    role: String, // "user", "assistant"
    content: Vec<MessageContent>,
}

#[tauri::command]
fn chat_api(messages: Vec<Message>) -> String {
    let last_user_message = messages.iter().rev().find(|m| m.role == "user");

    let user_text = if let Some(message) = last_user_message {
        message.content.iter()
            .filter(|c| c.msg_type == "text")
            .map(|c| c.text.clone())
            .collect::<Vec<String>>()
            .join(" ")
    } else {
        "我没听清你说什么～".to_string()
    };

    format!("你说的是：“{}”，我已经收到了！(来自Rust)", user_text)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![chat_api])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
