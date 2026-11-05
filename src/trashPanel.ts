import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import GLib from 'gi://GLib';
import St from 'gi://St';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import Clutter from 'gi://Clutter';

import * as TrashMenu from './trashMenu.js';
import * as SearchBox from './searchBox.js';
import * as ActionBar from './actionBar.js';
import * as TrashItem from './trashItem.js';
import * as Settings from './settings.js';
import * as ConfirmDialog from './confirmDialog.js';
import * as log from './log.js';
import * as utils from './utils.js';

let _ = (s: string) => s;

export function init(gettextFunc: (s: string) => string) {
    _ = gettextFunc;
}

class TrashPanelInternal extends PanelMenu.Button {
    private _trashPath: string = GLib.get_home_dir() + '/.local/share/Trash/';
    private _trash: Map<string, TrashItem.TrashItem> = new Map();
    private _trashMenu: TrashMenu.TrashMenu;
    private _searchBox: SearchBox.SearchBox;
    private _actionBar: ActionBar.ActionBar;
    private _settings: Settings.ExtensionSettings;
    private _openPrefs: () => void;
    private _trashIcon: any;

    private _monitor: any = null;
    private _monitorChangeID: number = 0;
    private _openStateChangedID: number = 0;
    private _keyPressEventID: number = 0;
    private _settingsChangedID: number = 0;
    private _focusTimerID: number = 0;

    constructor(settings: any, openPrefs: () => void) {
        super(0.0, _('Gnome Trash'), false);

        this._settings = new Settings.ExtensionSettings(settings);
        this._openPrefs = openPrefs;

        this._trashIcon = new St.Icon({
            icon_name: 'user-trash-full-symbolic',
            style_class: 'system-status-icon',
        });
        this.add_child(this._trashIcon);

        const trashDir = Gio.File.new_for_path(this._trashPath);
        if (!trashDir.query_exists(null)) {
            Main.notifyError(_('Gnome-trash failed to start'), _('No trash folder is detected.'));
        }

        this._trashMenu = new TrashMenu.TrashMenu(
            this._onActivateItem.bind(this),
            this._onDeleteItem.bind(this),
            this._onRestoreItem.bind(this),
        );
        this._searchBox = new SearchBox.SearchBox();
        this._actionBar = new ActionBar.ActionBar();

        this._setupPanel();
        this._setupMonitor();
    }

    public init() {
        // Called by extension.ts after the panel has been added to the bar.
        this._openStateChangedID = this.menu.connect(
            'open-state-changed',
            (_menu: any, open: boolean) => {
                log.debug('open-state-changed event');
                if (!open) return;

                this._updateThemeVariant();

                this._focusTimerID = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 50, () => {
                    this._searchBox.setText('');
                    global.stage.set_key_focus(this._searchBox.searchEntry);
                    this._focusTimerID = 0;
                    return GLib.SOURCE_REMOVE;
                });
            },
        );

        this._keyPressEventID = this._trashMenu.scrollView.connect('key-press-event', () => {
            log.debug('key-press event');
            global.stage.set_key_focus(this._searchBox.searchEntry);
            return Clutter.EVENT_PROPAGATE;
        });

        this._actionBar.onOpenSettings(() => this._openPrefs());
        this._actionBar.onEmptyTrash(this._onEmptyTrash.bind(this));
        this._actionBar.onOpenTrash(this._onOpenTrash.bind(this));
        this._searchBox.onTextChanged(this._onSearch.bind(this));
        this._settingsChangedID = this._settings.onChanged(this._onSettingsChanged.bind(this));

        this._onTrashChange();
    }

    private _setupPanel() {
        this.menu.box.add_style_class_name('gnome-trash');

        this.menu.addMenuItem(this._searchBox);
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this.menu.addMenuItem(this._trashMenu);
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this.menu.addMenuItem(this._actionBar);
    }

    // The stylesheet is written for a dark popup. Look at the background the
    // Shell theme actually gives the popup and, if it is light, add the `light`
    // class so the dark-on-light rules apply. Checked on every open so theme and
    // color-scheme changes are picked up without restarting the extension.
    private _updateThemeVariant() {
        const bg = this.menu.box.get_theme_node().get_background_color();
        const luminance = (0.2126 * bg.red + 0.7152 * bg.green + 0.0722 * bg.blue) / 255;
        if (luminance > 0.5) this.menu.box.add_style_class_name('light');
        else this.menu.box.remove_style_class_name('light');
    }

    private _onSearch() {
        const query = this._searchBox.getText().toLowerCase();
        this._trashMenu.filterItems(query);
    }

    private _setupMonitor() {
        const filesDir = Gio.File.new_for_path(this._trashPath + 'files/');
        this._monitor = filesDir.monitor_directory(Gio.FileMonitorFlags.NONE, null);
        this._monitorChangeID = this._monitor.connect('changed', this._onTrashChange.bind(this));
    }

    private _onTrashChange() {
        log.info('Trash has changed');

        this._trash.clear();
        const trashFilesPath = this._trashPath + 'files/';
        const trashInfoPath = this._trashPath + 'info/';

        try {
            const dir = Gio.File.new_for_path(trashFilesPath);
            if (!dir.query_exists(null)) {
                return;
            }

            const children = dir.enumerate_children('*', Gio.FileQueryInfoFlags.NONE, null);
            let fileInfo = null;
            const decoder = new TextDecoder();

            while ((fileInfo = children.next_file(null)) != null) {
                const filename = fileInfo.get_name();
                const trashPath = trashFilesPath + filename;
                const infoPath = trashInfoPath + filename + '.trashinfo';
                const [ok, info] = GLib.file_get_contents(infoPath);
                if (!ok) {
                    log.error(`unable to get contents of ${infoPath}`);
                    continue;
                }

                const lines = decoder.decode(info).split('\n');
                if (lines[0] !== '[Trash Info]') {
                    log.error(`unable to get contents of ${infoPath}`);
                }

                const pathLine = lines[1].split('=');
                const dateLine = lines[2].split('=');

                const restorePath = unescape(pathLine[1]);
                const deletedAt = unescape(dateLine[1]);

                const trashItem = new TrashItem.TrashItem(
                    fileInfo.get_symbolic_icon(),
                    filename,
                    trashPath,
                    infoPath,
                    deletedAt,
                    restorePath,
                );

                log.debug(`adding ${trashPath}`);
                this._trash.set(filename, trashItem);
            }
            children.close(null);
        } catch (err) {
            log.error(`an exception occurred ${err}`);
        }

        this._rebuildMenu();
    }

    private _rebuildMenu() {
        const arr = Array.from(this._trash.values());
        const trashSort = this._settings.trashSort();
        arr.sort(function (l: TrashItem.TrashItem, r: TrashItem.TrashItem): number {
            switch (trashSort) {
                case Settings.TRASH_SORT_FILE_NAME:
                    return l.filename.localeCompare(r.filename);

                case Settings.TRASH_SORT_DELETE_TIME:
                    return r.deletedAt.localeCompare(l.deletedAt);

                default:
                    log.error(`invalid sort ${trashSort}`);
                    return 0;
            }
        });

        this._trashMenu.rebuildMenu(arr);
        this._onSearch();

        // Update button
        this._trashIcon.icon_name = 'user-trash-full-symbolic';
        this.visible = true;

        if (this._trash.size === 0) {
            log.debug('trash is empty');
            this._trashIcon.icon_name = 'user-trash-empty-symbolic';
            if (this._settings.hideButton()) {
                this.visible = false;
            }
        }
    }

    private _onSettingsChanged() {
        log.info('settings changed');

        this._rebuildMenu();
    }

    private _onActivateItem(item: TrashItem.TrashItem) {
        switch (this._settings.activation()) {
            case Settings.ACTIVATION_OPEN:
                this._doOpenItem(item);
                break;

            case Settings.ACTIVATION_DELETE:
                this._onDeleteItem(item);
                break;

            case Settings.ACTIVATION_RESTORE:
                this._onRestoreItem(item);
                break;

            default:
                log.error(`invalid activation ${this._settings.activation()}`);
        }
    }

    private _onEmptyTrash() {
        const title = _('Empty Trash?');
        const message = _('Are you sure you want to delete all items from the trash?');
        const subMessage = _('This operation cannot be undone.');

        ConfirmDialog.openConfirmDialog(
            title,
            message,
            subMessage,
            this._doEmptyTrash.bind(this),
            _('Empty'),
        );
    }

    private async _doEmptyTrash() {
        await utils.spawnSync('gio', 'trash', '--empty');
    }

    private _onOpenTrash() {
        utils.spawnAsync('xdg-open', 'trash:///');
    }

    private _doOpenItem(item: TrashItem.TrashItem) {
        log.info(`try to open '${item.trashPath}'`);

        const file = Gio.File.new_for_path(item.trashPath);
        Gio.AppInfo.launch_default_for_uri(file.get_uri(), null);
        this._close();
    }

    private _onDeleteItem(item: TrashItem.TrashItem) {
        const title = _('Delete item permanently');
        const message = _(`Are you sure you want to delete '${item.filename}'?`);
        const subMessage = _('This operation cannot be undone.');

        ConfirmDialog.openConfirmDialog(
            title,
            message,
            subMessage,
            this._doDeleteItem.bind(this, item),
            _('Delete'),
        );
    }

    private async _doDeleteItem(item: TrashItem.TrashItem) {
        log.info(`try to delete '${item.filename}'`);

        if (await utils.spawnSync('rm', '-rf', item.trashPath)) {
            await utils.spawnSync('rm', '-f', item.infoPath);
        }
    }

    private _onRestoreItem(item: TrashItem.TrashItem) {
        const title = _('Restore item?');
        const message = _(`Restore '${item.filename}' to:\n'${item.restorePath}'`);
        const subMessage = _(`Deleted at: ${item.deletedAt}`);

        ConfirmDialog.openConfirmDialog(
            title,
            message,
            subMessage,
            this._doRestoreItem.bind(this, item),
            _('Restore'),
        );
    }

    private async _doRestoreItem(item: TrashItem.TrashItem) {
        log.info(`try to restore '${item.filename}' to: '${item.restorePath}'`);

        const dst = Gio.File.new_for_path(item.restorePath);
        if (dst.query_exists(null)) {
            Main.notifyError(_('Operation failed'), _('Refusing to overwrite existing file.'));
        } else {
            // Create parent directories if they do not exist
            const parentDir = item.restorePath.substring(0, item.restorePath.lastIndexOf('/') + 1);
            await utils.spawnSync('mkdir', '-p', parentDir);

            if (await utils.spawnSync('mv', item.trashPath, item.restorePath)) {
                await utils.spawnSync('rm', item.infoPath);
            }
        }
    }

    private _close() {
        this.menu.close();
    }

    public destroy() {
        if (this._focusTimerID) {
            GLib.source_remove(this._focusTimerID);
            this._focusTimerID = 0;
        }
        if (this._monitorChangeID && this._monitor) {
            this._monitor.disconnect(this._monitorChangeID);
            this._monitorChangeID = 0;
        }
        if (this._openStateChangedID) {
            this.menu.disconnect(this._openStateChangedID);
            this._openStateChangedID = 0;
        }
        if (this._keyPressEventID) {
            this._trashMenu.scrollView.disconnect(this._keyPressEventID);
            this._keyPressEventID = 0;
        }
        if (this._settingsChangedID) {
            this._settings.getSettings().disconnect(this._settingsChangedID);
            this._settingsChangedID = 0;
        }

        super.destroy();
    }
}

export interface TrashPanel extends TrashPanelInternal {}
export const TrashPanel = GObject.registerClass(
    {
        GTypeName: 'TrashPanel',
    },
    TrashPanelInternal,
);
