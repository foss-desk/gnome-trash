import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';

import * as log from './log.js';

export function log_methods(obj: any) {
    const result = [];
    for (const id in obj) {
        try {
            if (typeof obj[id] == 'function') {
                result.push(id + ': ' + obj[id].toString());
            }
        } catch {
            result.push(id + ': inaccessible');
        }
    }

    log.info(result.toString());
}

export function log_object(obj: any) {
    const seen: object[] = [];
    const json = JSON.stringify(obj, function (_key, val) {
        if (val != null && typeof val == 'object') {
            if (seen.indexOf(val) >= 0) {
                return;
            }
            seen.push(val);
        }
        return val;
    });
    log.info(json);
}

export function truncate(text: string, length: number): string {
    text = text.trim();
    text = text.replace(/\s+/g, ' ');

    if (text.length > length) {
        text = text.substring(0, length - 1) + '...';
    }

    return text;
}

export function spawnAsync(...args: string[]) {
    try {
        const flags = GLib.SpawnFlags.SEARCH_PATH;
        GLib.spawn_async(null, args, null, flags, null);
    } catch (err) {
        log.error(`an exception occurred: ${err}`);
    }
}

export async function spawnSync(...args: string[]) {
    try {
        const proc = new Gio.Subprocess({
            argv: args,
            flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE,
        });
        proc.init(null);

        return new Promise((resolve, reject) => {
            proc.communicate_utf8_async(null, null, (proc: any, res: any) => {
                try {
                    const [_stdout, stderr] = proc.communicate_utf8_finish(res);
                    if (stderr && stderr.length > 0) {
                        log.error(`an error occurred: ${stderr}`);
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                } catch (err) {
                    log.error(`an exception occurred: ${err}`);
                    reject(err);
                }
            });
        });
    } catch (err) {
        log.error(`an exception occurred: ${err}`);
        return false;
    }
}

// St.BoxLayout gained `orientation` in GNOME 48 (deprecating `vertical`);
// GNOME 45-47 only know `vertical` and throw on `orientation`.
const hasBoxOrientation = GObject.Object.find_property.call(St.BoxLayout, 'orientation') !== null;

export function boxOrientation(orientation: number): object {
    if (hasBoxOrientation) {
        return { orientation };
    }
    return { vertical: orientation === Clutter.Orientation.VERTICAL };
}
