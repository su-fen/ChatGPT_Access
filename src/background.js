'use strict'
import {app, protocol, BrowserWindow, globalShortcut, Tray, Menu, ipcMain, dialog, clipboard, screen} from 'electron'

const {autoUpdater} = require('electron-updater');
import {createProtocol} from 'vue-cli-plugin-electron-builder/lib'

const Store = require('electron-store');
import * as path from "path";
import axios from "axios";

const isDevelopment = process.env.NODE_ENV !== 'production'
let tray = null
let switchlabel = false
let translateWindowObj = null
let updateDialogShown = false;
let options = {
    translateEnabled: false,
}
// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
    {scheme: 'app', privileges: {secure: true, standard: true}}
])
Store.initRenderer()

//DLL加载
const ffi = require('ffi-napi');
let myDllPath
if (isDevelopment) {
    myDllPath = path.join(process.cwd(), 'resources', 'dll', 'copy.dll')
} else {
    myDllPath = path.join(process.resourcesPath,"extraResources" ,'dll', 'copy.dll')
}
const myDll = ffi.Library(myDllPath, {
    'SendCtrlC': ['void', []]  // 导出函数的定义
});

async function Initialization() {
    const isDevelopment = process.env.NODE_ENV !== 'production'
    let Path
    if(isDevelopment){
        Path = path.join(process.cwd(), 'resources','config')
    }else {
        Path = path.join(process.resourcesPath,"extraResources", 'config')
    }
    let option = {
        name: "config",
        fileExtension: "json",
        cwd: Path,
        clearInvalidConfig: true,
        // encryptionKey:'myKey'  //数据加密开关
    }
    const store = new Store(option);
    options.translateEnabled = store.get('translateOption.translateEnabled') === "true"
    if (options.translateEnabled) {
        globalShortcut.register('ctrl+m', () => {
            // 调用 DLL 中的 SendCtrlC 函数来模拟按下 Ctrl+C
            myDll.SendCtrlC();

            setTimeout(() => {
                const text = clipboard.readText();
                if(text!=="" && text!==undefined && text!==null){
                    translateWindowObj.webContents.send('translate_message', text);
                }else {
                    return
                }
                let {x, y} = screen.getCursorScreenPoint();
                let {width, height} = screen.getPrimaryDisplay().bounds;
                let winSize = translateWindowObj.getSize();

                x = Math.min(x, width - winSize[0]);
                y = Math.min(y, height - winSize[1]);
                x = Math.max(x, 0);
                y = Math.max(y, 0);
                translateWindowObj.setPosition(x, y);
                translateWindowObj.show();
            }, 100);
        });
    }else {
        const key = globalShortcut.isRegistered('ctrl+m')
        if (key) {
            globalShortcut.unregister('ctrl+m')
        }
    }
}


async function createWindow() {
    // Create the browser window.
    const win = new BrowserWindow({
        width: 1383,
        height: 900,
        title: 'ChatGPT',
        icon: './src/assets/chatgpt.png',
        webPreferences: {
            webSecurity: false,
            nodeIntegrationInWorker: true,
            enableRemoteModule: true,
            nodeIntegration: true,
            contextIsolation: false,  //跟窗口的打开有关
            nodeIntegrationInSubFrames: true,
            webviewTag: true // 这是允许 webview 标签的关键
        }
    })
    const args = process.argv;
    const hiddenIndex = args.indexOf('--hidden');

    if (hiddenIndex !== -1) {
        // 应用程序是用 "--hidden" 参数启动的
        win.hide();
    }
    win.setMenu(null)  // 移除顶部菜单
    ipcMain.handle('get-static-path', async () => {
        return path.join(__dirname, 'preload', 'preload.js')
    });

    if (process.env.WEBPACK_DEV_SERVER_URL) {
        // Load the url of the dev server if in development mode
        await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
    } else {
        createProtocol('app')
        // Load the index.html when not in development
        win.loadURL('app://./index.html')
    }
    require("@electron/remote/main").initialize()
    require("@electron/remote/main").enable(win.webContents)

    // globalShortcut.register('ctrl+p', () => {
    //     win.webContents.openDevTools()
    // })

    globalShortcut.register('ctrl+o', () => {
        if (win.isVisible()) {
            if (win.isMinimized() || !win.isFocused()) {
                win.restore();
                win.focus();
            } else {
                win.hide();
            }
        } else {
            win.show();
        }
    });

    ipcMain.on('textareaEnter', () => {
        win.webContents.send('newmessage', 'Hello from main process');
    });

    ipcMain.on('buttonClick', () => {
        win.webContents.send('newmessage', 'Hello from main process');
    });

    ipcMain.on('outerTextChanged', () => {
        win.webContents.send('read', 'Hello from main process');
    });

    ipcMain.handle('clear-cache', async () => {
        const session = win.webContents.session;
        try {
            await session.clearCache();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.on('toggle-always-on-top', (event) => {
        let flag = win.isAlwaysOnTop();
        ipcMain.emit('always-on-top-changed', !flag);
        win.setAlwaysOnTop(!flag, 'modal-panel');
        event.reply('always-on-top-status', !flag);
    });

    ipcMain.on('setting', async (event, data) => {
        if (data.message === "autoStart") {
            if (data.action.type === "setter") {
                if (data.action.enabled === true) {
                    console.log(app.getPath('exe'))
                    app.setLoginItemSettings({
                        openAtLogin: true,
                        path: app.getPath('exe'),
                        args: [
                            '--process-start-args', `"--hidden"`,
                            '--processStart', `"ChatGPT"`,
                        ]
                    })
                } else {
                    app.setLoginItemSettings({
                        openAtLogin: false,
                        path: app.getPath('exe'),
                        args: [
                            '--process-start-args', `"--hidden"`,
                            '--processStart', `"ChatGPT"`,
                        ]
                    })
                }
            } else if (data.action.type === "getter") {
                const settings = app.getLoginItemSettings({path: app.getPath('exe')})
                win.webContents.send('setting', {
                    message: "autoStart",
                    action: {type: "getter", enabled: settings.launchItems.length > 0}
                })
            }
        }
    });


    win.on('close', (event) => {
        if (switchlabel === false) {
            event.preventDefault() // 阻止默认行为
            win.hide() // 隐藏窗口
        }
    })

    // eslint-disable-next-line no-undef
    tray = new Tray(path.join(__static, './static/chatgpt.png'))
    const contextMenu = Menu.buildFromTemplate([
        {
            label: '退出',
            click: () => {
                switchlabel = true
                app.quit()
            }
        }
    ])
    tray.setToolTip('This is ChatGPT!')
    tray.setContextMenu(contextMenu)
    tray.on('double-click', () => {
        win.show() // 双击时显示窗口
    })


}


async function translateWindow() {
    // Create the browser window.
    translateWindowObj = new BrowserWindow({
        width: 450,
        height: 180,
        resizable: false,
        title: 'ChatGPT',
        icon: './src/assets/chatgpt.png',
        frame: false,
        skipTaskbar: true, // 这行代码将使窗口在任务栏中不显示图标
        webPreferences: {
            webSecurity: false,
            nodeIntegrationInWorker: true,
            enableRemoteModule: true,
            nodeIntegration: true,
            contextIsolation: false,  //跟窗口的打开有关
            nodeIntegrationInSubFrames: true,
            webviewTag: true // 这是允许 webview 标签的关键
        }
    })
    // 应用程序是用 "--hidden" 参数启动的
    translateWindowObj.hide();

    translateWindowObj.setMenu(null)  // 移除顶部菜单
    if (process.env.WEBPACK_DEV_SERVER_URL) {
        // Load the url of the dev server if in development mode
        await translateWindowObj.loadURL(process.env.WEBPACK_DEV_SERVER_URL + "#/translate");
    } else {
        createProtocol('app');
        // Load the index.html when not in development
        translateWindowObj.loadURL('app://./index.html#/translate');
    }
    // 当窗口失去焦点时隐藏窗口
    translateWindowObj.on('blur', () => {
        translateWindowObj.hide();
    });
    globalShortcut.register('ctrl+u', () => {
        translateWindowObj.webContents.openDevTools()
    })


    ipcMain.on('update', () => {
        Initialization()
        translateWindowObj.webContents.send('message', {type: "update", message: "update"});
    });
}

autoUpdater.on('update-downloaded', async () => {
    if (updateDialogShown) return;
    const info = await axios.get("https://cdn.xf233.com/electron_update_server/chatgpt_access/info.txt")
    const dialogOpts = {
        type: 'info',
        buttons: ['重启应用', '稍后更新'],
        title: 'ChatGPT 版本升级提示',
        detail: 'ChatGPT新版本已经下载完成。请重启应用以完成更新!\n\n更新内容：\n' + info.data,
    };

    updateDialogShown = true; // 设置标志为true，表示对话框已经显示
    dialog.showMessageBox(dialogOpts).then(({response}) => {
        if (response === 0) {
            switchlabel = true;
            autoUpdater.quitAndInstall();
        }
        updateDialogShown = false;
    })
        .catch(err => console.log(err));
});


// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('window-all-closed', () => {
    if (switchlabel === true) {
        app.quit()
    }
})

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
    const gotTheLock = app.requestSingleInstanceLock();
    if (!gotTheLock) {
        // 如果已经有一个实例正在运行，则关闭当前实例
        app.quit();
    } else {
        autoUpdater.autoInstallOnAppQuit = true;
        autoUpdater.autoRunAppAfterInstall = true;
        autoUpdater.checkForUpdates();
        setInterval(() => {
            autoUpdater.checkForUpdates();
        }, 300000); // 300000 毫秒等于 5 分钟
        createWindow();
        translateWindow()
        Initialization()
    }
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
    if (process.platform === 'win32') {
        process.on('message', (data) => {
            if (data === 'graceful-exit') {
                app.quit()
            }
        })
    } else {
        process.on('SIGTERM', () => {
            app.quit()
        })
    }
}
