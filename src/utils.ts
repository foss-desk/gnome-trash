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

// Like truncate(), but keeps the end of the text, which is the meaningful part
// for paths and similar values.
export function truncateLeft(text: string, length: number): string {
    text = text.trim();

    if (text.length > length) {
        text = '...' + text.substring(text.length - (length - 3));
    }

    return text;
}

// Shell code must not use synchronous file IO (e.g. GLib.file_get_contents):
// it blocks the compositor. Use the async Gio API and await the result.
export function readFileText(file: Gio.File): Promise<string> {
    return new Promise((resolve, reject) => {
        file.load_contents_async(null, (source: any, res: any) => {
            try {
                const [ok, contents] = source.load_contents_finish(res);
                if (!ok) {
                    reject(new Error(`unable to read ${file.get_path()}`));
                    return;
                }
                resolve(new TextDecoder().decode(contents));
            } catch (err) {
                reject(err);
            }
        });
    });
}

export function deleteFile(file: Gio.File): Promise<void> {
    return new Promise((resolve, reject) => {
        file.delete_async(GLib.PRIORITY_DEFAULT, null, (source: any, res: any) => {
            try {
                source.delete_finish(res);
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    });
}

// Gio.File.delete() refuses to remove non-empty directories, so walk the tree
// and remove children before the directory itself.
export async function deleteRecursively(file: Gio.File): Promise<void> {
    const info = await queryFileInfo(file);
    if (info.get_file_type() === Gio.FileType.DIRECTORY) {
        const enumerator = await enumerateChildren(file);
        for (;;) {
            const infos = await nextFiles(enumerator);
            if (infos.length === 0) break;

            for (const childInfo of infos) {
                await deleteRecursively(enumerator.get_child(childInfo));
            }
        }
    }

    await deleteFile(file);
}

export function moveFile(source: Gio.File, destination: Gio.File): Promise<void> {
    return new Promise((resolve, reject) => {
        source.move_async(
            destination,
            Gio.FileCopyFlags.NONE,
            GLib.PRIORITY_DEFAULT,
            null,
            null,
            (src: any, res: any) => {
                try {
                    src.move_finish(res);
                    resolve();
                } catch (err) {
                    reject(err);
                }
            },
        );
    });
}

// Gio has no asynchronous make_directory_with_parents(), so create each missing
// ancestor individually and ignore the ones that already exist.
export async function makeDirectoryWithParents(file: Gio.File): Promise<void> {
    const parent = file.get_parent();
    if (parent !== null) {
        await makeDirectoryWithParents(parent);
    }

    try {
        await makeDirectory(file);
    } catch (err: any) {
        if (!err.matches?.(Gio.IOErrorEnum, Gio.IOErrorEnum.EXISTS)) {
            throw err;
        }
    }
}

function makeDirectory(file: Gio.File): Promise<void> {
    return new Promise((resolve, reject) => {
        file.make_directory_async(GLib.PRIORITY_DEFAULT, null, (source: any, res: any) => {
            try {
                source.make_directory_finish(res);
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    });
}

function queryFileInfo(file: Gio.File): Promise<any> {
    return new Promise((resolve, reject) => {
        file.query_info_async(
            'standard::type',
            Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS,
            GLib.PRIORITY_DEFAULT,
            null,
            (source: any, res: any) => {
                try {
                    resolve(source.query_info_finish(res));
                } catch (err) {
                    reject(err);
                }
            },
        );
    });
}

function enumerateChildren(file: Gio.File): Promise<any> {
    return new Promise((resolve, reject) => {
        file.enumerate_children_async(
            'standard::name',
            Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS,
            GLib.PRIORITY_DEFAULT,
            null,
            (source: any, res: any) => {
                try {
                    resolve(source.enumerate_children_finish(res));
                } catch (err) {
                    reject(err);
                }
            },
        );
    });
}

function nextFiles(enumerator: any): Promise<any[]> {
    return new Promise((resolve, reject) => {
        enumerator.next_files_async(100, GLib.PRIORITY_DEFAULT, null, (source: any, res: any) => {
            try {
                resolve(source.next_files_finish(res));
            } catch (err) {
                reject(err);
            }
        });
    });
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
