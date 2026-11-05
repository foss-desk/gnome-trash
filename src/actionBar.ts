import St from 'gi://St';
import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import * as utils from './utils.js';
import * as Tooltip from './tooltip.js';

let _ = (s: string) => s;

export function init(gettextFunc: (s: string) => string) {
    _ = gettextFunc;
}

export class ActionBar extends PopupMenu.PopupBaseMenuItem {
    private _openBtn: any;
    private _emptyBtn: any;
    private _settingsBtn: any;

    static {
        GObject.registerClass(this);
    }

    constructor() {
        super({
            reactive: false,
            activate: false,
            hover: false,
            can_focus: false,
            style_class: 'action-bar-container',
        });

        const mainBox = new St.BoxLayout({
            ...utils.boxOrientation(Clutter.Orientation.HORIZONTAL),
            x_expand: true,
            style_class: 'action-bar',
        });

        // Open Trash
        this._openBtn = this._createButton('folder-open-symbolic', _('Open Trash'));
        Tooltip.attachTooltip(this._openBtn, () => _('Open Trash'));
        mainBox.add_child(this._openBtn);

        // Spacer
        const spacer = new St.Widget({ x_expand: true });
        mainBox.add_child(spacer);

        // Empty Trash
        this._emptyBtn = this._createButton(
            'edit-delete-symbolic',
            _('Empty Trash'),
            'action-btn-danger',
        );
        Tooltip.attachTooltip(this._emptyBtn, () => _('Empty Trash'));
        mainBox.add_child(this._emptyBtn);

        // Settings
        this._settingsBtn = this._createIconButton('emblem-system-symbolic');
        Tooltip.attachTooltip(this._settingsBtn, () => _('Settings'));
        mainBox.add_child(this._settingsBtn);

        this.add_child(mainBox);
    }

    private _createButton(iconName: string, label: string, extraClass: string = '') {
        const box = new St.BoxLayout({
            ...utils.boxOrientation(Clutter.Orientation.HORIZONTAL),
            style_class: 'action-btn-content',
        });
        box.add_child(new St.Icon({ icon_name: iconName, icon_size: 16 }));
        box.add_child(new St.Label({ text: label, y_align: Clutter.ActorAlign.CENTER }));

        return new St.Button({
            style_class: `action-btn ${extraClass}`,
            child: box,
            can_focus: true,
            track_hover: true,
        });
    }

    private _createIconButton(iconName: string, extraClass: string = '') {
        return new St.Button({
            style_class: `action-btn ${extraClass}`,
            child: new St.Icon({ icon_name: iconName, icon_size: 16 }),
            can_focus: true,
            track_hover: true,
        });
    }

    onOpenTrash(callback: () => void) {
        this._openBtn.connect('clicked', callback);
    }

    onEmptyTrash(callback: () => void) {
        this._emptyBtn.connect('clicked', callback);
    }

    onOpenSettings(callback: () => void) {
        this._settingsBtn.connect('clicked', callback);
    }
}
