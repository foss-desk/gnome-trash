// In GNOME 45+, the shell modules are ES modules and console logging is the
// recommended way to report diagnostics (journalctl picks it up).

export enum LOG_LEVELS {
    OFF,
    ERROR,
    WARN,
    INFO,
    DEBUG,
}

let _settings: any = null;

export function init(settings: any) {
    _settings = settings;
}

export function log_level() {
    if (!_settings) return LOG_LEVELS.INFO;
    return _settings.get_uint('log-level');
}

export function log(text: string) {
    console.log(`Gnome Trash: ${text}`);
}

export function error(text: string) {
    if (log_level() >= LOG_LEVELS.ERROR) console.error(`Gnome Trash: [ERROR] ${text}`);
}

export function warn(text: string) {
    if (log_level() >= LOG_LEVELS.WARN) console.warn(`Gnome Trash: [WARN] ${text}`);
}

export function info(text: string) {
    if (log_level() >= LOG_LEVELS.INFO) console.info(`Gnome Trash: [INFO] ${text}`);
}

export function debug(text: string) {
    if (log_level() >= LOG_LEVELS.DEBUG) console.debug(`Gnome Trash: [DEBUG] ${text}`);
}
