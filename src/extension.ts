import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

import * as TrashPanel from './trashPanel.js';
import * as TrashMenu from './trashMenu.js';
import * as MenuItem from './menuItem.js';
import * as ActionBar from './actionBar.js';
import * as ConfirmDialog from './confirmDialog.js';
import * as SearchBox from './searchBox.js';
import * as log from './log.js';
import * as Settings from './settings.js';

export default class GnomeTrashExtension extends Extension {
    private _panel: TrashPanel.TrashPanel | null = null;

    enable() {
        log.info(`enabling...`);

        // Initialize logging with settings
        log.init(this.getSettings(Settings.SCHEMA_ID));

        if (!this._panel) {
            // Every module keeps its own `_`, so each one has to be handed the
            // extension's gettext or its strings stay in English.
            const gettext = this.gettext.bind(this);
            for (const mod of [
                TrashPanel,
                TrashMenu,
                MenuItem,
                ActionBar,
                ConfirmDialog,
                SearchBox,
            ])
                mod.init(gettext);

            this._panel = new TrashPanel.TrashPanel(this.getSettings(Settings.SCHEMA_ID), () =>
                this.openPreferences(),
            );
            Main.panel.addToStatusArea(this.uuid, this._panel);
            if (this._panel) this._panel.init();
        }
    }

    disable() {
        log.info(`disabling...`);

        if (this._panel) {
            this._panel.destroy();
            this._panel = null;
        }
    }
}
