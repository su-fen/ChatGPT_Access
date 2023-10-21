const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    sendEvent: (channel) => {
        ipcRenderer.send(channel);
    },
});
