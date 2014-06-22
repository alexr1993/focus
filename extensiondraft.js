/*****************************************************************
A smart window management extension by alexr1993
******************************************************************/

/*****************************************************************
                         CONST & VARS
*****************************************************************/
const St = imports.gi.St;
const Main = imports.ui.main;
const Cinnamon = imports.gi.Cinnamon;
const WindowManager = imports.ui.windowManager;
const MessageTray = imports.ui.messageTray;
const Lang = imports.lang;
/*panelMenu.js has been removed in Cinnamon 1.8.x*/
/*const PanelMenu = imports.ui.panelMenu;*/
const DND = imports.ui.dnd;
const Meta = imports.gi.Meta;
const Clutter = imports.gi.Clutter;
const Signals = imports.signals;
const Tweener = imports.ui.tweener;
const Workspace = imports.ui.workspace;
const Settings = imports.ui.settings

const logfile = 

/*****************************************************************
                            FUNCTIONS
*****************************************************************/

// cannot remove
function init(metadata)
{

}

// cannot remove
function enable() {
    status = false;
    monitors = Main.layoutManager.monitors;
    tracker = Cinnamon.WindowTracker.get_default();

    nbCols = 4;
    nbRows = 4;

    area = new St.BoxLayout({style_class: 'grid-preview'});
    Main.uiGroup.add_actor(area);

    initSettings();
    initGrids(); 

    enableHotkey();

    tracker.connect('notify::focus-app', Lang.bind(this, this._onFocus));
    global.log("KEY BINDNGS");


}

// cannot remove
function disable() 
{

}

function setBackgroundMode()
{
    // dim, disable, hide, animate window
}

function resetFocusMetaWindow()
{
    if(focusMetaWindowConnections.length>0)
    {
        for(var idx in focusMetaWindowConnections)
        {
            focusMetaWindow.disconnect(focusMetaWindowConnections[idx]);
        }
    }
    
    if(focusMetaWindowPrivateConnections.length>0)
    {
        let actor = focusMetaWindow.get_compositor_private();
        if(actor)
        {
            for(var idx in focusMetaWindowPrivateConnections)
            {
                actor.disconnect(focusMetaWindowPrivateConnections[idx]);
            }
        }
    }
    
    focusMetaWindow = false;
    focusMetaWindowConnections = new Array();
    focusMetaWindowPrivateConnections = new Array();
}

function initGrids()
{
	grids = new Array();
	for(monitorIdx in monitors)
	{
		let monitor = monitors[monitorIdx];
		let grid = new Grid(monitorIdx,monitor,"gTile", nbCols, nbRows);
		let key = getMonitorKey(monitor);
		grids[key] = grid;
		
		Main.layoutManager.addChrome(grid.actor, { visibleInFullscreen: true });
		grid.actor.set_opacity(0);
		grid.hide(true);
		grid.connect('hide-tiling',Lang.bind(this,this.hideTiling));
	}
}

function destroyGrids()
{
    for(monitorIdx in monitors)
	{
		let monitor = monitors[monitorIdx];
		let key = getMonitorKey(monitor);
		grid = grids[key];
		grid.hide(true);
		Main.layoutManager.removeChrome(grid.actor);
	}
}

function refreshGrids()
{
    for(var gridIdx in grids)
    {
        let grid = grids[gridIdx];
        grid.refresh();
    }
    
    Main.layoutManager._chrome.updateRegions();
}

function moveGrids()
{
    if(!status)
    {
        return;
    }
    
    let window = focusMetaWindow;
    if(window)
    {
        for(var gridIdx in grids)
        {
            let grid = grids[gridIdx];
            let pos_x;
	        let pos_y;
	        
	        let monitor = grid.monitor;
	        if(window.get_monitor() == grid.monitor_idx)
	        {
	            pos_x = window.get_outer_rect().width / 2  + window.get_outer_rect().x;
	            pos_y = window.get_outer_rect().height / 2  + window.get_outer_rect().y;
	        }
	        else
	        {
	            pos_x =monitor.x + monitor.width/2;
	            pos_y = monitor.y + monitor.height/2;
	        }        
	        
	        pos_x = Math.floor(pos_x - grid.actor.width / 2);
	        pos_y = Math.floor(pos_y - grid.actor.height / 2);
	        
	        if(window.get_monitor() == grid.monitor_idx)
	        {
	            pos_x = (pos_x < monitor.x) ? monitor.x : pos_x;
	            pos_x = ((pos_x + grid.actor.width) >  (monitor.width+monitor.x)) ?  monitor.x + monitor.width - grid.actor.width : pos_x;
	            pos_y = (pos_y < monitor.y) ? monitor.y : pos_y;
	            pos_y = ((pos_y + grid.actor.height) > (monitor.height+monitor.y)) ? monitor.y + monitor.height - grid.actor.height : pos_y;
	        }
	        
	        let time = (gridSettings[SETTINGS_ANIMATION]) ? 0.3 : 0.1;
	        
	        Tweener.addTween(grid.actor,
                         { 
                           time: time,
                           x:pos_x,
                           y:pos_y,
                           transition: 'easeOutQuad',
                           onComplete:this.updateRegions});
        }
    }
}

function updateRegions()
{
    Main.layoutManager._chrome.updateRegions();
    refreshGrids();
    for(let idx in grids)
    {
        let grid = grids[idx];
        grid.elementsDelegate.reset();
    }
}

function reset_window(metaWindow)
{
    metaWindow.unmaximize(Meta.MaximizeFlags.HORIZONTAL); 
    metaWindow.unmaximize(Meta.MaximizeFlags.VERTICAL);
    metaWindow.unmaximize(Meta.MaximizeFlags.HORIZONTAL | Meta.MaximizeFlags.VERTICAL);
}

function _getInvisibleBorderPadding(metaWindow) {
        let outerRect = metaWindow.get_outer_rect();
        let inputRect = metaWindow.get_input_rect();
        let [borderX, borderY] = [outerRect.x - inputRect.x,
                                  outerRect.y - inputRect.y];
    
        return [borderX, borderY];
}
    
function _getVisibleBorderPadding (metaWindow) {
        let clientRect = metaWindow.get_rect();
        let outerRect = metaWindow.get_outer_rect();

        let borderX = outerRect.width - clientRect.width
        let borderY = outerRect.height - clientRect.height;

        return [borderX, borderY];
}

function move_maximize_window(metaWindow,x,y)
{
    let borderX,borderY,vBorderX,vBorderY;
    [borderX,borderY] = this._getInvisibleBorderPadding(metaWindow);

    x = x - borderX;
    y = y - borderY;
   

    metaWindow.move_frame(true,x,y);
    metaWindow.maximize(Meta.MaximizeFlags.HORIZONTAL | Meta.MaximizeFlags.VERTICAL);
}

function move_resize_window(metaWindow,x,y,width,height)
{
    let borderX,borderY,vBorderX,vBorderY;
    [vBorderX,vBorderY] = this._getVisibleBorderPadding(metaWindow);
    
    x = x; //- borderX;
    y = y; //- borderY;
    
    width = width - vBorderX;
    height = height - vBorderY ;

    metaWindow.resize(true,width,height);
    metaWindow.move_frame(true,x,y);
}

function _isMyWindow(win)
{
    global.log("meta-window: "+this.focusMetaWindow+" : "+win.meta_window);
    return (this.focusMetaWindow == win.meta_window);
}

function getWindowActor()
{
    let windows = global.get_window_actors().filter(this._isMyWindow, this);
    focusWindowActor = windows[0];
    
    global.log("window actor: "+focusWindowActor+":"+focusMetaWindow.get_compositor_private() );
}

function getNotFocusedWindowsOfMonitor(monitor)
{
    return Main.getTabList().filter(function(w) {
                                        return focusMetaWindow!= w;
                                    });
}

function getWindowsOfMonitor(monitor)
{
    return Main.getTabList();
}

function _onFocus()
{
    let window = getFocusApp();
    if(window)
    {   
        resetFocusMetaWindow();

        //global.log("Connect window: "+window.get_title());
        focusMetaWindow = window;
        focusMetaWindowConnections.push(focusMetaWindow.connect('notify::title',Lang.bind(this,this._onFocus)));
        
        let actor = focusMetaWindow.get_compositor_private();
        if(actor)
        {
            focusMetaWindowPrivateConnections.push(actor.connect('size-changed',Lang.bind(this,this.moveGrids)));
            focusMetaWindowPrivateConnections.push(actor.connect('position-changed',Lang.bind(this,this.moveGrids)));
        }
       
        //global.log("End Connect window: "+window.get_title());

        let app = tracker.get_window_app(focusMetaWindow);
        let title = focusMetaWindow.get_title();
        
        for(monitorIdx in monitors)
            {
		    let monitor = monitors[monitorIdx];
		    let key = getMonitorKey(monitor);
		    let grid = grids[key];
		    if(app)
		        grid.topbar._set_app(app,title);
            else
                grid.topbar._set_title(title);
	    }
	    
	    moveGrids();
    }
    else
    {
        resetFocusMetaWindow();
        for(var gridIdx in grids)
        {
            let grid = grids[gridIdx];
            grid.topbar._set_title('gTile');
        }
        
    }
}



function getMonitorKey(monitor)
{
    return monitor.x+":"+monitor.width+":"+monitor.y+":"+monitor.height;
}

function getFocusApp()
{ 
    let windows = global.screen.get_active_workspace().list_windows();
    for ( let i = 0; i < windows.length; ++i ) 
    {
            let metaWindow = windows[i];
            if(metaWindow.has_focus())
            {
                return metaWindow;
            }
    }
    return false;
}

function isPrimaryMonitor(monitor)
{
    return Main.layoutManager.primaryMonitor == monitor;
}

/*****************************************************************
                            PROTOTYPES
*****************************************************************/

function WindowDaemon(title)
{
    this._init(title);
}

WindowDaemon.prototype = {
      
    _init: function(title) {
        // when window is created, check if other windows have been covered
    },
    
    _isObscured : function()
    {
        // todo return true if less of the window is visible than the
        // threshold amount
    }
};