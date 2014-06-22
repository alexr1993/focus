const St = imports.gi.St;
const Lang = imports.lang;
const Main = imports.ui.main;
const Tweener = imports.ui.tweener;
const Clutter = imports.gi.Clutter;
const Settings = imports.ui.settings;


let on_window_created;
initSettings();
enableHotkey();
enable();

function initSettings()
{
    global.log("initSettings");

    this.settings = new Settings.ExtensionSettings(this, "focus@alexr");
    this.settings.bindProperty(Settings.BindingDirection.IN,
        "hotkey",
        "hotkey",
        enableHotkey,
        null);
    global.log("initSettings complete");
}

function enableHotkey() {
  global.log("enabling hotkey");
  disableHotkey();
  Main.keybindingManager.addHotKey("focus", this.hotkey, Lang.bind(this, disable));
  global.log("hotkey enabled");
}

function disableHotkey() {
  Main.keybindingManager.removeHotKey("focus");
}

function init() {
}

function getWindowActor(metaWindow) {
  var window_actor;
  global.get_window_actors().forEach(function (wa) {
    if (wa.get_meta_window() === metaWindow) {
      window_actor = wa;
    }
  });
  return window_actor;
}

function enable() {
    function window_created(__unused_display, the_window) {
        if (the_window) {
            the_window._sweep_on_focus = the_window.connect('focus', desktopSweep);
            the_window._sweep_on_minimize = the_window.connect('minimize', desktopSweep);
            the_window._sweep_on_unminimize = the_window.connect('unminimize', desktopSweep);
        }
    }
    on_window_created = global.display.connect('window-created', window_created);

    global.get_window_actors().forEach(function(wa) {
        var meta_win = wa.get_meta_window();
        if (!meta_win) {
            return;
        }
        //wa.set_opacity(185);
        window_created(null, wa.get_meta_window());
    });
}

function disable() {
    global.log("disabling focus@alexr")
    if (on_window_created) {
        global.display.disconnect(on_window_created);
    }
    global.get_window_actors().forEach(function(wa) {
       var win = wa.get_meta_window();
       if (win && win._sweep_on_focus) {
           win.disconnect(win._sweep_on_focus);
           delete win._sweep_on_focus;
       }
    });
    global.log("focus@alexr disabled");
}

// Keep desktop organised
function desktopSweep(the_window) {
    global.log("sweeping desktop");
    var actor = getWindowActor(the_window);
    if (!actor) {
        return;
    }
    // make all windows overlapping with the actor (which is a focused window) translucent
    global.get_window_actors().forEach(function (wa) {
        var mw = wa.get_meta_window();
        if (overlapExists(actor, wa) && actor !== wa) {
            wa.set_opacity(185);

            if (!mw.minimized) {
              mw.minimize();
            }
        }
        else if (actor === wa) {
            wa.set_opacity(255);
            if (mw.minimized) {
              mw.unminimize();
            }
        }
    });
}

// there is a problem with this function
function overlapExists(actor1, actor2) {
    // global.log("checking for overlap");
    // global.log(actor1); global.log(actor2);

    var pos1 = actor1.get_position();
    var pos2 = actor2.get_position();
    var height1 = actor1.get_height();
    var height2 = actor2.get_height();
    var width1 = actor1.get_width();
    var width2 = actor2.get_width();
    var xOverlap = false;
    var yOverlap = false;

    // global.log("check x");

    // check x overlap
    var xPosDiff = pos2[0] - pos1[0];

    // window 2 is further right than window 1
    if (xPosDiff >= 0) {
        if (width1 >= xPosDiff) {
            xOverlap = true;
        }
    }
    else if (width2 >= Math.abs(xPosDiff)) {
            xOverlap = true;
    }

    // global.log("check y");
    // check y overlap
    var yPosDiff = pos2[1] - pos1[1];

    // window 2 is further down than window 1
    if (yPosDiff >= 0) {
        if (height1 >= yPosDiff) {
            yOverlap = true;
        }
    }
    else if (height2 >= Math.abs(yPosDiff)) {
        yOverlap = true;
    }

    if (xOverlap && yOverlap) {
      // global.log("Windows overlapping");
    }
    else {
      // global.log("windows not overlapping");
    }
    return xOverlap && yOverlap;
}