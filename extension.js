/* extension.js
 *
 * Copyright 2022 Matthew Jakeman <mjakeman26@outlook.co.nz>
 * Copyright 2022 System76/Pop Shell contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const GETTEXT_DOMAIN = 's76-scheduler-plugin';

const { GObject, St } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;

const Gio = imports.gi.Gio;

const SchedulerInterface = '<node>\
<interface name="com.system76.Scheduler"> \
    <method name="SetForegroundProcess"> \
        <arg name="pid" type="u" direction="in"/> \
    </method> \
</interface> \
</node>';

const SchedulerProxy = Gio.DBusProxy.makeProxyWrapper(SchedulerInterface)

const SchedProxy = new SchedulerProxy(
    Gio.DBus.system,
    "com.system76.Scheduler",
    "/com/system76/Scheduler"
)

let foreground = 0

class Extension {
    constructor(uuid) {
        this._uuid = uuid;

        ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
    }

    enable() {        
        log("Initialising system76-scheduler integration");
        
        this._handler = global.display.connect('notify::focus-window', () => {
            let meta_window = global.display.focus_window;
                        
            const pid = meta_window.get_pid()
            
            if (pid) {
                if (foreground === pid) return
                foreground = pid

                try {
                    log(`Setting priority for ${meta_window.get_title()}`)
                    SchedProxy.SetForegroundProcessRemote(pid)
                } catch (_) {}
            }
        });
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;

        global.display.disconnect(this._handler);
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
