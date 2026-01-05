// BETA: Console visible for debugging - users can see GPU detection, download progress, and errors
// TODO: Re-enable for production release:
// #![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    glee::run()
}
