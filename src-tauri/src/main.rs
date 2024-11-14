#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::thread;
mod server;

#[tauri::command]
async fn start_server() {
    server::start_server().await.expect("Failed to start server");
}
fn main() {
    let context = tauri::generate_context!();

    thread::spawn(|| {
        actix_web::rt::System::new().block_on(start_server());
    });

    tauri::Builder::default()
        .menu(tauri::Menu::os_default(&context.package_info().name))
        .invoke_handler(tauri::generate_handler![start_server])
        .run(context)
        .expect("error while running tauri application");
}
