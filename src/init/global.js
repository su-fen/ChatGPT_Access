export default {


    Store: function (name) {
        const Store = window.require('electron-store');
        const path = window.require('path');
        const isDevelopment = process.env.NODE_ENV !== 'production'
        let Path
        if (isDevelopment) {
            Path = path.join(process.cwd(), 'resources', 'config')
        } else {
            Path = path.join(process.resourcesPath, "extraResources", 'config')
        }
        let option = {
            name: name,
            fileExtension: "json",
            cwd: Path,
            clearInvalidConfig: true,
            // encryptionKey:'myKey'  //数据加密开关
        }
        return new Store(option)
    },
}
