import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import * as Settings from './settings.js';

export default class GnomeTrashPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window: Adw.PreferencesWindow) {
        this._loadPreferencesStyle();

        const settings = this.getSettings(Settings.SCHEMA_ID);

        const page = new Adw.PreferencesPage();
        page.add_css_class('prefs-page');
        window.add(page);

        const group = new Adw.PreferencesGroup({
            title: this.gettext('Preferences'),
        });
        page.add(group);

        // Sort trash by
        const sortRow = new Adw.ComboRow({
            title: this.gettext('Sort trash by'),
        });
        sortRow.set_model(
            Gtk.StringList.new([this.gettext('File name'), this.gettext('Delete time')]),
        );
        settings.bind(Settings.TRASH_SORT, sortRow, 'selected', Gio.SettingsBindFlags.DEFAULT);
        group.add(sortRow);

        // Activation behavior
        const activationRow = new Adw.ComboRow({
            title: this.gettext('Activation behavior'),
        });
        activationRow.set_model(
            Gtk.StringList.new([
                this.gettext('Open the file'),
                this.gettext('Restore the file'),
                this.gettext('Delete the file'),
            ]),
        );
        settings.bind(
            Settings.ACTIVATION,
            activationRow,
            'selected',
            Gio.SettingsBindFlags.DEFAULT,
        );
        group.add(activationRow);

        // Hide button when trash is empty
        const hideRow = new Adw.SwitchRow({
            title: this.gettext('Hide button when trash is empty'),
        });
        settings.bind(Settings.HIDE_BUTTON, hideRow, 'active', Gio.SettingsBindFlags.DEFAULT);
        group.add(hideRow);
    }

    private _loadPreferencesStyle(): void {
        try {
            const cssPath = this.dir.get_child('stylesheet.css').get_path();
            const provider = new Gtk.CssProvider();
            provider.load_from_path(cssPath);

            const display = Gdk.Display.get_default();
            if (display) {
                Gtk.StyleContext.add_provider_for_display(
                    display,
                    provider,
                    Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION,
                );
            }
        } catch (error) {
            console.error('Failed to load preferences stylesheet:', error);
        }
    }
}
