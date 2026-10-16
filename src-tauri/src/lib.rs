// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Quits for real. Closing the window only hides it to the tray (see
/// `on_window_event`), so "Salir" in the app menu goes through this.
#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

/// Brings the main window back from the tray, minimized or behind others.
#[cfg(desktop)]
fn show_main_window(app: &tauri::AppHandle) {
    use tauri::Manager;

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

/// Pomodoro phase ended: pulls the window in front of every other app and
/// flashes it in the taskbar, since the Windows toast alone is easy to miss.
/// Toggling always-on-top raises it even when Windows refuses to hand focus
/// to a background app.
#[tauri::command]
fn alert_main_window(app: tauri::AppHandle) {
    #[cfg(desktop)]
    {
        use tauri::{Manager, UserAttentionType};

        show_main_window(&app);
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.set_always_on_top(true);
            let _ = window.set_always_on_top(false);
            let _ = window.request_user_attention(Some(UserAttentionType::Critical));
        }
    }
    #[cfg(mobile)]
    let _ = app;
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct ActivityInfo {
    /// Time since the last keyboard or mouse input anywhere in the system.
    idle_ms: u64,
    /// Time since Windows booted (or woke from Fast Startup's hibernation).
    uptime_ms: u64,
}

/// Feeds the break reminder: how long the user has been away from the PC and
/// how long it has been on. Only Windows reports it; elsewhere it is `None`
/// and the reminder stays off.
#[tauri::command]
fn activity_info() -> Option<ActivityInfo> {
    #[cfg(windows)]
    {
        use windows_sys::Win32::System::SystemInformation::{GetTickCount, GetTickCount64};
        use windows_sys::Win32::UI::Input::KeyboardAndMouse::{GetLastInputInfo, LASTINPUTINFO};

        let mut last_input = LASTINPUTINFO {
            cbSize: std::mem::size_of::<LASTINPUTINFO>() as u32,
            dwTime: 0,
        };
        // SAFETY: plain Win32 calls with a correctly sized struct.
        let (ok, now, uptime) = unsafe {
            (
                GetLastInputInfo(&mut last_input),
                GetTickCount(),
                GetTickCount64(),
            )
        };
        if ok == 0 {
            return None;
        }

        // Both tick counts are u32 that wrap every ~49 days; wrapping_sub
        // keeps the difference right across the wrap.
        Some(ActivityInfo {
            idle_ms: u64::from(now.wrapping_sub(last_input.dwTime)),
            uptime_ms: uptime,
        })
    }
    #[cfg(not(windows))]
    None
}

/// Tray icon: left click opens the window, right click shows the menu.
#[cfg(desktop)]
fn build_tray(app: &tauri::App) -> tauri::Result<()> {
    use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
    use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};

    let open = MenuItem::with_id(app, "open", "Abrir Pockira", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Salir de Pockira", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &separator, &quit])?;

    let mut tray = TrayIconBuilder::with_id("main")
        .tooltip("Pockira")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => show_main_window(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main_window(tray.app_handle());
            }
        });

    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }

    tray.build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        // Must be registered first so it can intercept the OAuth deep link
        // when Windows/Linux relaunch the app with the callback URL as argv.
        // Launching the app again also brings back a window hidden in the tray.
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main_window(app);
        }));

        // Self-update from the GitHub releases (see plugins.updater in
        // tauri.conf.json); desktop only, stores update apps themselves.
        builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
    }

    builder
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_oauth::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            // Windows and Linux only learn the `pockira://` scheme from the
            // installer, so a dev build (or a portable exe) registers it at
            // runtime; otherwise the OAuth callback never reaches the app.
            #[cfg(any(windows, target_os = "linux"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                app.deep_link().register_all()?;
            }

            #[cfg(desktop)]
            build_tray(app)?;

            Ok(())
        })
        // Closing the window (X, Alt+F4) hides it to the tray instead of
        // quitting, so reminders and the pomodoro keep ringing. The tray menu
        // and "Salir" in the app menu quit for real.
        .on_window_event(|window, event| {
            #[cfg(desktop)]
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            quit_app,
            alert_main_window,
            activity_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
