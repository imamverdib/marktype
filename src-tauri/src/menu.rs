//! Native macOS menu bar.
//!
//! Every custom item carries a stable id. Selecting one emits a single
//! `menu:action` event to the webview, where the React layer owns the actual
//! behaviour — the menu never mutates document state itself.

use tauri::{
    menu::{AboutMetadata, Menu, MenuItemBuilder, SubmenuBuilder},
    AppHandle, Emitter, Runtime,
};

/// Event name the webview listens on for menu selections.
pub const MENU_EVENT: &str = "menu:action";

struct Item {
    id: &'static str,
    label: &'static str,
    accelerator: Option<&'static str>,
}

const fn item(id: &'static str, label: &'static str, accelerator: Option<&'static str>) -> Item {
    Item {
        id,
        label,
        accelerator,
    }
}

/// Builds the whole menu bar. Ids here must match `MenuAction` in `src/lib/menu.ts`.
pub fn build<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    let mut app_menu = SubmenuBuilder::new(app, "MarkType")
        .about(Some(AboutMetadata {
            name: Some("MarkType".into()),
            version: Some(env!("CARGO_PKG_VERSION").into()),
            comments: Some("A fast, minimalist Markdown editor.".into()),
            copyright: Some("© 2026 Behbudlu".into()),
            ..Default::default()
        }))
        .separator();
    app_menu = app_menu.item(&build_item(app, &item("preferences", "Preferences…", Some("CmdOrCtrl+,")))?);
    let app_menu = app_menu
        .separator()
        .services()
        .separator()
        .hide()
        .hide_others()
        .show_all()
        .separator()
        .quit()
        .build()?;

    const FILE_ITEMS: &[Item] = &[
        item("new", "New", Some("CmdOrCtrl+N")),
        item("open", "Open…", Some("CmdOrCtrl+O")),
    ];
    const SAVE_ITEMS: &[Item] = &[
        item("save", "Save", Some("CmdOrCtrl+S")),
        item("save-as", "Save As…", Some("CmdOrCtrl+Shift+S")),
    ];
    const EXPORT_ITEMS: &[Item] = &[
        item("reveal", "Reveal in Finder", Some("CmdOrCtrl+Alt+R")),
        item("copy-markdown", "Copy Document as Markdown", None),
    ];

    let mut file_menu = SubmenuBuilder::new(app, "File");
    for i in FILE_ITEMS {
        file_menu = file_menu.item(&build_item(app, i)?);
    }
    file_menu = file_menu.separator();
    for i in SAVE_ITEMS {
        file_menu = file_menu.item(&build_item(app, i)?);
    }
    file_menu = file_menu.separator();
    for i in EXPORT_ITEMS {
        file_menu = file_menu.item(&build_item(app, i)?);
    }
    let file_menu = file_menu.separator().close_window().build()?;

    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .build()?;

    const FORMAT_ITEMS: &[Item] = &[
        item("bold", "Bold", Some("CmdOrCtrl+B")),
        item("italic", "Italic", Some("CmdOrCtrl+I")),
        item("underline", "Underline", Some("CmdOrCtrl+U")),
        item("strike", "Strikethrough", Some("CmdOrCtrl+Shift+X")),
        item("highlight", "Highlight", Some("CmdOrCtrl+Shift+H")),
        item("code", "Inline Code", Some("CmdOrCtrl+Shift+C")),
        item("link", "Link…", Some("CmdOrCtrl+K")),
    ];
    const HEADING_ITEMS: &[Item] = &[
        item("paragraph", "Paragraph", Some("CmdOrCtrl+0")),
        item("h1", "Heading 1", Some("CmdOrCtrl+1")),
        item("h2", "Heading 2", Some("CmdOrCtrl+2")),
        item("h3", "Heading 3", Some("CmdOrCtrl+3")),
        item("h4", "Heading 4", Some("CmdOrCtrl+4")),
        item("h5", "Heading 5", Some("CmdOrCtrl+5")),
        item("h6", "Heading 6", Some("CmdOrCtrl+6")),
    ];

    let mut format_menu = SubmenuBuilder::new(app, "Format");
    for i in FORMAT_ITEMS {
        format_menu = format_menu.item(&build_item(app, i)?);
    }
    format_menu = format_menu.separator();
    for i in HEADING_ITEMS {
        format_menu = format_menu.item(&build_item(app, i)?);
    }
    let format_menu = format_menu
        .separator()
        .item(&build_item(
            app,
            &item("clear-format", "Clear Formatting", Some("CmdOrCtrl+Shift+K")),
        )?)
        .build()?;

    const INSERT_ITEMS: &[Item] = &[
        item("bullet-list", "Bullet List", Some("CmdOrCtrl+Shift+8")),
        item("ordered-list", "Ordered List", Some("CmdOrCtrl+Shift+7")),
        item("task-list", "Task List", Some("CmdOrCtrl+Shift+9")),
        item("blockquote", "Blockquote", Some("CmdOrCtrl+Shift+B")),
        item("code-block", "Code Block", Some("CmdOrCtrl+Alt+C")),
        item("table", "Table", Some("CmdOrCtrl+Alt+T")),
        item("math-block", "Math Block", Some("CmdOrCtrl+Alt+M")),
        item("image", "Image…", Some("CmdOrCtrl+Alt+I")),
        item("horizontal-rule", "Horizontal Rule", Some("CmdOrCtrl+Alt+H")),
    ];
    let mut insert_menu = SubmenuBuilder::new(app, "Insert");
    for i in INSERT_ITEMS {
        insert_menu = insert_menu.item(&build_item(app, i)?);
    }
    let insert_menu = insert_menu.build()?;

    const VIEW_ITEMS: &[Item] = &[
        item("toggle-theme", "Toggle Dark Mode", Some("CmdOrCtrl+Shift+D")),
        item("toggle-typewriter", "Typewriter Mode", Some("CmdOrCtrl+Alt+P")),
        item("toggle-focus-mode", "Focus Mode", Some("CmdOrCtrl+Alt+F")),
        item("toggle-autosave", "Auto-save", Some("CmdOrCtrl+Alt+S")),
        item("toggle-source", "Source Code Mode", Some("CmdOrCtrl+/")),
    ];
    let mut view_menu = SubmenuBuilder::new(app, "View");
    for i in VIEW_ITEMS {
        view_menu = view_menu.item(&build_item(app, i)?);
    }
    let view_menu = view_menu
        .separator()
        .item(&build_item(
            app,
            &item("devtools", "Toggle Developer Tools", Some("CmdOrCtrl+Alt+Shift+I")),
        )?)
        .build()?;

    let window_menu = SubmenuBuilder::new(app, "Window")
        .minimize()
        .maximize()
        .separator()
        .fullscreen()
        .build()?;

    let help_menu = SubmenuBuilder::new(app, "Help")
        .item(&build_item(
            app,
            &item("shortcuts", "Keyboard Shortcuts", Some("CmdOrCtrl+Shift+/")),
        )?)
        .build()?;

    Menu::with_items(
        app,
        &[
            &app_menu,
            &file_menu,
            &edit_menu,
            &format_menu,
            &insert_menu,
            &view_menu,
            &window_menu,
            &help_menu,
        ],
    )
}

fn build_item<R: Runtime>(
    app: &AppHandle<R>,
    spec: &Item,
) -> tauri::Result<tauri::menu::MenuItem<R>> {
    let mut builder = MenuItemBuilder::with_id(spec.id, spec.label);
    if let Some(accelerator) = spec.accelerator {
        builder = builder.accelerator(accelerator);
    }
    builder.build(app)
}

/// Forwards a menu selection to the frontend.
pub fn forward<R: Runtime>(app: &AppHandle<R>, id: &str) {
    let _ = app.emit(MENU_EVENT, id);
}
