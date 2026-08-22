//! MarkType — Tauri backend.
//!
//! The Rust side stays deliberately thin: it owns the native menu, the macOS
//! "open with" hand-off and a couple of Finder helpers. Reading and writing
//! Markdown happens through `tauri-plugin-fs` from the frontend.

mod menu;

use std::{path::Path, sync::Mutex, time::Duration};

use serde::Serialize;
use tauri::{Emitter, Manager};

/// Event emitted when macOS hands us files to open (Finder double-click,
/// "Open With", `open -a MarkType file.md`).
const OPEN_FILES_EVENT: &str = "app:open-files";

/// Files handed to the app before the webview was ready to listen.
#[derive(Default)]
struct PendingFiles(Mutex<Vec<String>>);

#[derive(Serialize)]
struct FileMeta {
    path: String,
    exists: bool,
    /// Last modification time in milliseconds since the Unix epoch.
    modified_ms: Option<u64>,
    size: Option<u64>,
}

/// Drains files queued before the frontend attached its listener.
#[tauri::command]
fn take_pending_files(state: tauri::State<'_, PendingFiles>) -> Vec<String> {
    let mut queue = state.0.lock().expect("pending files mutex poisoned");
    std::mem::take(&mut *queue)
}

/// Selects a file in Finder, the way ⌘⌥R does in most macOS editors.
#[tauri::command]
fn reveal_in_finder(path: String) -> Result<(), String> {
    if !Path::new(&path).exists() {
        return Err(format!("{path} does not exist"));
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .args(["-R", &path])
            .spawn()
            .map_err(|error| error.to_string())?;
    }
    #[cfg(not(target_os = "macos"))]
    {
        let parent = Path::new(&path).parent().unwrap_or(Path::new("."));
        opener_fallback(parent).map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[cfg(not(target_os = "macos"))]
fn opener_fallback(path: &Path) -> std::io::Result<()> {
    std::process::Command::new(if cfg!(windows) { "explorer" } else { "xdg-open" })
        .arg(path)
        .spawn()
        .map(|_| ())
}

/// Surfaces uncaught frontend errors in the terminal running `tauri dev`.
/// WKWebView keeps its console to itself, so without this a broken render is
/// a blank window and no explanation.
#[tauri::command]
fn log_frontend_error(message: String, source: Option<String>) {
    match source {
        Some(source) => eprintln!("[marktype][webview] {message} ({source})"),
        None => eprintln!("[marktype][webview] {message}"),
    }
}

/// Cheap metadata probe used to notice edits made outside the app.
#[tauri::command]
fn file_meta(path: String) -> FileMeta {
    let metadata = std::fs::metadata(&path).ok();
    let modified_ms = metadata.as_ref().and_then(|meta| {
        meta.modified().ok().and_then(|time| {
            time.duration_since(std::time::UNIX_EPOCH)
                .ok()
                .map(|delta| delta.as_millis() as u64)
        })
    });
    FileMeta {
        exists: metadata.is_some(),
        size: metadata.as_ref().map(|meta| meta.len()),
        modified_ms,
        path,
    }
}

fn markdown_like(path: &str) -> bool {
    Path::new(path)
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| {
            matches!(
                ext.to_ascii_lowercase().as_str(),
                "md" | "markdown" | "mdown" | "mkd" | "mdx" | "txt"
            )
        })
        .unwrap_or(false)
}

/// Queues paths and, if the frontend is already listening, forwards them.
fn hand_off_files(app: &tauri::AppHandle, paths: Vec<String>) {
    let paths: Vec<String> = paths
        .into_iter()
        .filter(|path| markdown_like(path) && Path::new(path).is_file())
        .collect();
    if paths.is_empty() {
        return;
    }
    if let Some(state) = app.try_state::<PendingFiles>() {
        state
            .0
            .lock()
            .expect("pending files mutex poisoned")
            .extend(paths.clone());
    }
    let _ = app.emit(OPEN_FILES_EVENT, paths);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(PendingFiles::default())
        .invoke_handler(tauri::generate_handler![
            take_pending_files,
            reveal_in_finder,
            file_meta,
            log_frontend_error
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            handle.set_menu(menu::build(&handle)?)?;

            // Files given on the command line (`open -a MarkType note.md` on a
            // cold start arrives here rather than through `RunEvent::Opened`).
            let args: Vec<String> = std::env::args().skip(1).collect();
            hand_off_files(&handle, args);

            // The window starts hidden so the first paint is already themed.
            // The frontend shows it; this is the safety net if that never runs.
            if let Some(window) = app.get_webview_window("main") {
                std::thread::spawn(move || {
                    std::thread::sleep(Duration::from_millis(2500));
                    if !window.is_visible().unwrap_or(true) {
                        eprintln!(
                            "[marktype] the frontend never asked for the window; \
                             showing it anyway — check the webview for errors"
                        );
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                });
            }
            Ok(())
        })
        .on_menu_event(|app, event| {
            let id = event.id().0.as_str();
            // Dev tools are a backend concern: the JS API cannot open them.
            #[cfg(debug_assertions)]
            if id == "devtools" {
                if let Some(window) = app.get_webview_window("main") {
                    if window.is_devtools_open() {
                        window.close_devtools();
                    } else {
                        window.open_devtools();
                    }
                }
            }
            menu::forward(app, id);
        })
        .build(tauri::generate_context!())
        .expect("error while building MarkType");

    app.run(|app_handle, event| {
        #[cfg(target_os = "macos")]
        if let tauri::RunEvent::Opened { urls } = &event {
            let paths: Vec<String> = urls
                .iter()
                .filter_map(|url| url.to_file_path().ok())
                .map(|path| path.to_string_lossy().to_string())
                .collect();
            hand_off_files(app_handle, paths);
        }
        let _ = (app_handle, event);
    });
}
