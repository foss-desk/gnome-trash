import St from 'gi://St';
import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import * as TrashItem from './trashItem.js';
import * as utils from './utils.js';
import * as Tooltip from './tooltip.js';

let _ = (s: string) => s;

export function init(gettextFunc: (s: string) => string) {
    _ = gettextFunc;
}

export class MenuItem extends PopupMenu.PopupBaseMenuItem {
    public fileInfo: TrashItem.TrashItem;

    static {
        GObject.registerClass(this);
    }

    constructor(
        fileInfo: TrashItem.TrashItem,
        onActivate: (item: MenuItem) => void,
        onDelete: (item: MenuItem) => void,
        onRestore: (item: MenuItem) => void,
    ) {
        super({ style_class: 'trash-item' });

        this.fileInfo = fileInfo;

        const row = new St.BoxLayout({
            ...utils.boxOrientation(Clutter.Orientation.HORIZONTAL),
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });

        const icon = new St.Icon({
            gicon: fileInfo.icon,
            style_class: 'popup-menu-icon',
            icon_size: 16,
        });
        row.add_child(icon);

        const textBox = new St.BoxLayout({
            ...utils.boxOrientation(Clutter.Orientation.VERTICAL),
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });

        const label = new St.Label({
            text: fileInfo.display(),
            style_class: 'trash-item-text',
            x_expand: true,
        });
        textBox.add_child(label);

        const deletedAt = new St.Label({
            text: `${_('Deleted')} ${fileInfo.deletedAtDisplay()}`,
            style_class: 'trash-item-subtext',
            x_expand: true,
        });
        textBox.add_child(deletedAt);

        const location = new St.Label({
            text: fileInfo.location(),
            style_class: 'trash-item-subtext trash-item-location',
            x_expand: true,
        });
        textBox.add_child(location);

        row.add_child(textBox);

        const actionBox = new St.BoxLayout({
            ...utils.boxOrientation(Clutter.Orientation.HORIZONTAL),
            x_align: Clutter.ActorAlign.END,
            y_align: Clutter.ActorAlign.CENTER,
        });

        // Restore button
        const restoreBtn = this._createActionBtn('edit-undo-symbolic');
        Tooltip.attachTooltip(restoreBtn, () => _('Restore'));
        restoreBtn.connect('clicked', () => onRestore(this));
        actionBox.add_child(restoreBtn);

        // Delete button
        const deleteBtn = this._createActionBtn('edit-delete-symbolic', 'remove-icon');
        Tooltip.attachTooltip(deleteBtn, () => _('Delete'));
        deleteBtn.connect('clicked', () => onDelete(this));
        actionBox.add_child(deleteBtn);

        row.add_child(actionBox);
        this.add_child(row);

        this.connect('activate', () => {
            onActivate(this);
        });
    }

    private _createActionBtn(iconName: string, extraClass: string = '') {
        return new St.Button({
            style_class: `item-action-btn ${extraClass}`,
            child: new St.Icon({
                icon_name: iconName,
                icon_size: 14,
                style_class: 'popup-menu-icon',
            }),
            can_focus: true,
            track_hover: true,
        });
    }

    public text(): string {
        return this.fileInfo.filename;
    }
}
