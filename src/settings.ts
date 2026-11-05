export const SCHEMA_ID = 'org.gnome.shell.extensions.gnome-trash';

export const TRASH_SORT = 'trash-sort';
export const ACTIVATION = 'activation';
export const HIDE_BUTTON = 'hide-button';

export const TRASH_SORT_FILE_NAME = 0;
export const TRASH_SORT_DELETE_TIME = 1;

export const ACTIVATION_OPEN = 0;
export const ACTIVATION_RESTORE = 1;
export const ACTIVATION_DELETE = 2;

export class ExtensionSettings {
    private _settings: Gio.Settings;

    constructor(settings: Gio.Settings) {
        this._settings = settings;
    }

    onChanged(callback: () => void): number {
        return this._settings.connect('changed', callback);
    }

    trashSort(): number {
        return this._settings.get_uint(TRASH_SORT);
    }

    activation(): number {
        return this._settings.get_uint(ACTIVATION);
    }

    hideButton(): boolean {
        return this._settings.get_boolean(HIDE_BUTTON);
    }

    getSettings(): Gio.Settings {
        return this._settings;
    }
}
