import St from 'gi://St';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import Clutter from 'gi://Clutter';

import * as ScrollMenu from './scrollMenu.js';
import * as MenuItem from './menuItem.js';
import * as TrashItem from './trashItem.js';
import * as utils from './utils.js';
import * as log from './log.js';

let _ = (s: string) => s;

export function init(gettextFunc: (s: string) => string) {
    _ = gettextFunc;
}

export class TrashMenu extends ScrollMenu.ScrollMenu {
    private _onActivateItem: (item: TrashItem.TrashItem) => void;
    private _onDeleteItem: (item: TrashItem.TrashItem) => void;
    private _onRestoreItem: (item: TrashItem.TrashItem) => void;

    constructor(
        onActivateItem: (item: TrashItem.TrashItem) => void,
        onDeleteItem: (item: TrashItem.TrashItem) => void,
        onRestoreItem: (item: TrashItem.TrashItem) => void,
    ) {
        super();

        this._onActivateItem = onActivateItem;
        this._onDeleteItem = onDeleteItem;
        this._onRestoreItem = onRestoreItem;
    }

    public rebuildMenu(trash: Array<TrashItem.TrashItem>) {
        log.info(`rebuild menu`);

        super.removeAll();

        if (trash.length === 0) {
            this._showEmptyState();
            return;
        }

        trash.forEach((info) => {
            const item = new MenuItem.MenuItem(
                info,
                this.onActivateItem.bind(this),
                this.onDeleteItem.bind(this),
                this.onRestoreItem.bind(this),
            );

            super.addMenuItem(item);
        });
    }

    private _showEmptyState() {
        const box = new St.BoxLayout({
            ...utils.boxOrientation(Clutter.Orientation.VERTICAL),
            x_expand: true,
            y_expand: true,
            style_class: 'empty-state',
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
        });

        const icon = new St.Icon({
            icon_name: 'user-trash-symbolic',
            style_class: 'empty-state-icon',
        });
        box.add_child(icon);

        const label = new St.Label({
            text: _('Trash is empty'),
            style_class: 'empty-state-label',
        });
        box.add_child(label);

        const container = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            activate: false,
            hover: false,
        });
        container.add_child(box);
        super.addMenuItem(container);
    }

    private onActivateItem(item: MenuItem.MenuItem) {
        this._onActivateItem(item.fileInfo);
    }

    private onDeleteItem(item: MenuItem.MenuItem) {
        this._onDeleteItem(item.fileInfo);
    }

    private onRestoreItem(item: MenuItem.MenuItem) {
        this._onRestoreItem(item.fileInfo);
    }
}
