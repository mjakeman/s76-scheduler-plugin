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

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

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

let foreground = 0;
let sourceIds = [];

export default class Extension {
    constructor(uuid) {
        this._uuid = uuid;
    }

    enable() {
        log("Initialising system76-scheduler integration");

        // Update foreground process whenever the window focus is changed
        this._handler = global.display.connect('notify::focus-window', () => {
            let meta_window = global.display.focus_window;

            if (!meta_window)
                return;

            // Prioritise process of currently focused window
            const pid = meta_window.get_pid();

            if (pid) {
                if (foreground === pid) return
                foreground = pid;

                SchedProxy.SetForegroundProcessRemote(pid, (result, error) => {
                    if (error) {
                        // On error, notify the user and write to stderr
                        idleId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                            Main.notifyError("Failed to communicate with system76-scheduler service.");
                            logError(error);

                            // Remove idleId from tracking list
                            const index = array.indexOf(idleId);
                            if (index > -1) {
                                array.splice(index, 1);
                            }

                            return false;
                        });
                        sourceIds.push(idleId);
                    }
                });
            }
        });
    }

    disable() {
        global.display.disconnect(this._handler);
        while (sourceIds.length > 0) {
            let idleId = sourceIds.pop();
            GLib.Source.remove(idleId);
        }
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
