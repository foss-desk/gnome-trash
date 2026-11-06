import GLib from 'gi://GLib';

import * as utils from './utils.js';

export class TrashItem {
    public icon: any;
    public filename: string;
    public trashPath: string;
    public infoPath: string;
    public restorePath: string;
    public deletedAt: string;

    constructor(
        icon: any,
        filename: string,
        trashPath: string,
        infoPath: string,
        deletedAt: string,
        restorePath: string,
    ) {
        this.icon = icon;
        this.filename = filename;
        this.trashPath = trashPath;
        this.infoPath = infoPath;
        this.deletedAt = deletedAt;
        this.restorePath = restorePath;
    }

    display(): string {
        return utils.truncate(this.filename, 32);
    }

    // Human readable deletion time parsed from the ISO-8601 timestamp stored in
    // the .trashinfo file, falling back to the raw value if it cannot be parsed.
    deletedAtDisplay(): string {
        const dt = GLib.DateTime.new_from_iso8601(this.deletedAt, null);
        if (dt) {
            const formatted = dt.format('%x %H:%M');
            if (formatted) return formatted;
        }

        return this.deletedAt;
    }

    // Directory the item was deleted from. Truncated from the left so the most
    // meaningful (deepest) part of the path stays visible.
    location(): string {
        const idx = this.restorePath.lastIndexOf('/');
        const dir = idx > 0 ? this.restorePath.substring(0, idx) : this.restorePath;
        return utils.truncateLeft(dir, 48);
    }
}
