const {defineConfig} = require('@vue/cli-service')
module.exports = defineConfig({
    productionSourceMap: false,
    transpileDependencies: true,
    chainWebpack: config => {
        config.plugin('html').tap(args => {
            args[0].title = 'ChatGPT Access Server';
            return args;
        });
    },
    pluginOptions: {
        electronBuilder: {
            webSecurity: false,
            nodeIntegration: true,
            contextIsolation: false,
            nodeIntegrationInWorker: true,
            enableRemoteModule: true,
            nodeIntegrationInSubFrames: true,
            webviewTag: true, // 这是允许 webview 标签的关键
            customFileProtocol: "./",
            externals: [
                //这里是需要引入的依赖（electron-builder需要手动把package.json里的dependencies引入过来）
                "@electron/remote",
                "core-js",
                "element-ui",
                "markdown-it",
                "vue",
                "electron-updater",
                "axios",
                "ali-oss",
                "microsoft-cognitiveservices-speech-sdk",
                "vue-router",
                "ffi-napi",
            ],
            builderOptions: {
                asar: true,
                "publish": [
                    {
                        "provider": "generic",
                        "url": "https://cdn.xf233.com/electron_update_server/chatgpt_access/"
                    }
                ],
                "productName": "ChatGPT",	//项目名 这也是生成的exe文件的前缀名
                "appId": "com.ChatGPT.Software",	//包名
                "copyright": "SuFeng",	//版权信息
                "directories": {
                    // 输出文件夹
                    "output": "ChatGPT",
                },
                win: {
                    icon: "./src/assets/chatgpt.png",
                },
                mac: {
                    category: "public.app-category.games",
                    icon: "./src/assets/chatgpt.png",
                },
                dmg: {
                    contents: [
                        {
                            x: 110,
                            y: 150
                        },
                        {
                            x: 410,
                            y: 150,
                            type: "link",
                            path: "/Applications"
                        }
                    ]
                },

                nsis: {
                    perMachine: true,
                    allowToChangeInstallationDirectory: true, // 允许修改安装目录
                    oneClick: false,// 是否一键安装
                    installerIcon: "./src/assets/icons/install.ico",
                    installerHeaderIcon: "./src/assets/icons/install.ico",
                    uninstallerIcon: "./src/assets/icons/uninstall.ico",
                    shortcutName: "ChatGPT",
                },
                //额外资源
                "extraResources": [
                    {
                        "from": "./resources/",
                        "to": "extraResources",
                        "filter": [
                            "**/*"
                        ]
                    }
                ],
            },

        }
    },
})
