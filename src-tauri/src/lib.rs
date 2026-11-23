mod rules;
mod store;

use rules::{Note, Patch};
use store::Store;
use tauri::{
    menu::{AboutMetadataBuilder, MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder},
    Manager, State,
};
use tauri_plugin_dialog::DialogExt;

fn now_ms() -> i64 { chrono::Utc::now().timestamp_millis() }
fn today() -> String { chrono::Local::now().format("%Y-%m-%d").to_string() }

#[tauri::command]
fn list_notes(store: State<Store>, month: String) -> Result<Vec<Note>, String> { store.read(&month) }
#[tauri::command]
fn add_note(store: State<Store>, date: String, text: String, color: String) -> Result<Note, String> { store.add(&date, &text, &color, now_ms()) }
#[tauri::command]
fn patch_note(store: State<Store>, month: String, id: String, text: Option<String>, color: Option<String>, completed: Option<bool>) -> Result<Note, String> {
    store.patch(&month, &id, Patch { text, color, completed }, now_ms(), &today())
}
#[tauri::command]
fn add_comment(store: State<Store>, month: String, id: String, comment: String) -> Result<Note, String> { store.comment(&month, &id, &comment, now_ms()) }
#[tauri::command]
fn delete_note(store: State<Store>, month: String, id: String) -> Result<(), String> { store.delete(&month, &id, now_ms()) }

// Menu items reuse the page's own keyboard shortcuts by dispatching the key.
fn press(app: &tauri::AppHandle, key: &str) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.eval(format!("window.dispatchEvent(new KeyboardEvent('keydown',{{key:'{key}',bubbles:true}}))"));
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|app| {
            let dir = app.path().app_data_dir()?.join("notes");
            std::fs::create_dir_all(&dir)?;
            app.manage(Store::new(dir));

            let about = AboutMetadataBuilder::new().name(Some("meetcal")).version(Some("0.1.0")).comments(Some("A sticky-note work-log calendar.")).build();
            let handle = app.handle();
            let app_menu = SubmenuBuilder::new(handle, "meetcal")
                .about(Some(about)).separator().services().separator().hide().hide_others().show_all().separator().quit().build()?;
            let file_menu = SubmenuBuilder::new(handle, "File")
                .item(&MenuItemBuilder::with_id("import", "Import notes from folder…").build(handle)?)
                .separator().close_window().build()?;
            let edit_menu = SubmenuBuilder::new(handle, "Edit")
                .undo().redo().separator().cut().copy().paste().select_all().build()?;
            let themes = SubmenuBuilder::new(handle, "Themes")
                .item(&MenuItemBuilder::with_id("themes", "Use the theme picker in the header").enabled(false).build(handle)?).build()?;
            let view_menu = SubmenuBuilder::new(handle, "View")
                .item(&MenuItemBuilder::with_id("today", "Today").accelerator("CmdOrCtrl+T").build(handle)?)
                .item(&MenuItemBuilder::with_id("month", "Month View").accelerator("CmdOrCtrl+M").build(handle)?)
                .item(&MenuItemBuilder::with_id("help", "Keyboard Shortcuts").build(handle)?)
                .separator().item(&themes).separator().fullscreen().build()?;
            let window_menu = SubmenuBuilder::new(handle, "Window").minimize().maximize().build()?;
            let _ = PredefinedMenuItem::separator(handle)?;
            let menu = MenuBuilder::new(handle).items(&[&app_menu, &file_menu, &edit_menu, &view_menu, &window_menu]).build()?;
            app.set_menu(menu)?;
            Ok(())
        })
        .on_menu_event(|app, ev| match ev.id().as_ref() {
            "today" => press(app, "t"),
            "month" => press(app, "m"),
            "help" => press(app, "?"),
            "import" => {
                let app2 = app.clone();
                app.dialog().file().set_title("Import notes from folder").pick_folder(move |folder| {
                    let Some(path) = folder.and_then(|f| f.into_path().ok()) else { return };
                    let store = app2.state::<Store>();
                    let msg = match store.import_dir(&path) {
                        Ok(n) => format!("Imported {n} new note(s)."),
                        Err(e) => format!("Import failed: {e}"),
                    };
                    app2.dialog().message(msg).title("meetcal").show(|_| {});
                    if let Some(w) = app2.get_webview_window("main") { let _ = w.eval("location.reload()"); }
                });
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![list_notes, add_note, patch_note, add_comment, delete_note])
        .run(tauri::generate_context!())
        .expect("error while running meetcal");
}
