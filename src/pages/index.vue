<template>
  <div class="container">
    <div v-show="!isLoaded" class="skeleton">
      <el-skeleton :rows="30" animated/>
    </div>
    <div class="container" v-show="isLoaded">

      <webview v-if="webviewReady" ref="webview" :src="src" style="display:flex; width:100%; height:100%"
               enableremotemodule :preload="preload"></webview>
      <div v-show="toolsView" class="tools">
        <el-tooltip content="复制为Markdown">
          <el-button type="info" plain icon="el-icon-document-copy" circle
                     :style="buttonStyle" @click="page_copy"></el-button>
        </el-tooltip>
        <el-tooltip content="下载为Markdown">
          <el-button type="info" plain icon="el-icon-download" circle
                     :style="buttonStyle" @click="page_download"></el-button>
        </el-tooltip>
        <el-tooltip content="窗口置顶">
          <el-button type="info" plain icon="el-icon-attract" circle :style="buttonStyle"
                     @click="page_top"></el-button>
        </el-tooltip>

        <el-tooltip content="刷新页面">
          <el-button type="info" plain icon="el-icon-refresh" circle :style="buttonStyle"
                     @click="page_refresh"></el-button>
        </el-tooltip>
      </div>
      <div v-show="toolsView" class="aside_tools">
        <el-tooltip content="临时文件上传">
          <el-button type="info" plain icon="el-icon-upload" circle append-to-body :style="buttonStyle"
                     @click="drawer_Upload"></el-button>
        </el-tooltip>
        <br>
        <div style="margin:10px 10px"></div>
        <el-tooltip content="回复朗读">
          <el-button type="info" plain icon="el-icon-headset" circle append-to-body :style="buttonStyle"
                     @click="playAudio"></el-button>
        </el-tooltip>
        <br>
        <div style="margin:10px 10px"></div>
        <el-tooltip content="清除缓存">
          <el-button type="info" plain icon="el-icon-takeaway-box" circle append-to-body :style="buttonStyle"
                     @click="cache_clear"></el-button>
        </el-tooltip>
        <br>
        <div style="margin:10px 10px"></div>
        <el-tooltip content="设置">
          <el-button type="info" plain icon="el-icon-s-tools" circle append-to-body :style="buttonStyle"
                     @click="drawer_Setting"></el-button>
        </el-tooltip>
      </div>
      <Uploader_page ref="uploader_page"></Uploader_page>
      <Setting_page ref="setting_page"></Setting_page>
    </div>
  </div>
</template>

<script>
import path from "path";
import speaker from "@/utils/speaker";
import Uploader_page from "@/components/uploader.vue";
import Setting_page from "@/components/setting.vue";

export default {
  name: 'index_page',
  components: {
    Setting_page,
    Uploader_page
  },
  data() {
    return {
      isLoaded: false,
      src: 'https://chat.xf233.com/',
      theme: "light",
      clock: null,
      toolsView: false,
      preload: "",
      webviewReady: false,
      reader: false,
      readerEvent: null,
      currentSource: null,
    }
  },

  async created() {
    document.title = this.$route.meta.title;
    // const path = window.require('path');
    let staticPath = path.join(__dirname, 'preload', 'preload.js')

    if (process.env.NODE_ENV === 'development') {
      this.preload = 'file://' + path.join(process.cwd(), 'public', 'preload', 'preload.js');
    } else {
      this.preload = staticPath
    }
    this.webviewReady = true;
    console.log("Wlecome to use ChatGPT!")
    await this.$nextTick();  // 确保 webview 已经被渲染
    this.mountedInit();  // 添加事件监听器
    this.init()
  },
  mounted() {

  },
  computed: {
    buttonStyle() {
      if (this.theme === 'dark') {
        return 'color:#FFFFFF;background-color: rgba(52, 53, 65, 0.5);backdrop-filter: blur(10px);';
      } else {
        return 'color:#000000;  background-color: rgba(255, 255, 255, 0.5); backdrop-filter: blur(10px);';
      }
    },

  },
  methods: {
    async init() {
      const {ipcRenderer} = window.require('electron');
      ipcRenderer.on('always-on-top-status', (event, isAlwaysOnTop) => {
        if (isAlwaysOnTop === true) {
          this.$message({
            message: '已置顶',
            type: 'success'
          });
        } else {
          this.$message({
            message: '已取消置顶',
            type: 'success'
          });
        }
      });


      ipcRenderer.on('read', async () => {
        console.log('outerTextChanged')
        await this.readSync()
      });

    },
    async readSync() {
      const {ipcRenderer} = window.require('electron');
      if (this.reader) {
        try {
          const script = `
              (() => {
        const element = document.getElementsByClassName('relative flex w-[calc(100%-50px)] flex-col gizmo:w-full lg:w-[calc(100%-115px)] agent-turn')
        return element[element.length-1].innerText;
      })()
    `;
          const text = await this.$refs.webview.executeJavaScript(script);
          const voiceConfig = {
            model: "zh-CN-XiaoxiaoNeural",
            content: text,
            mood: ""
          }
          const ssmlText = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="en-US">
                          <voice name="${voiceConfig.model}">
                              <mstts:express-as >
                                  ${voiceConfig.content}
                              </mstts:express-as>
                          </voice>
                          </speak>`;
          const response = await speaker.textToSpeech(ssmlText, voiceConfig);
          const buffer = response.data.buffer;  // Convert Node.js Buffer to ArrayBuffer
          if (response.status === "success") {
            let audioContext = new (window.AudioContext || window.webkitAudioContext)();
            await audioContext.decodeAudioData(buffer, (decodedData) => {
              // 如果有正在播放的音频，停止它
              if (this.currentSource) {
                this.currentSource.stop();
              }
              let source = audioContext.createBufferSource();
              source.buffer = decodedData;
              source.connect(audioContext.destination);
              source.start(0);
              // 将新的音频源保存为当前音频源
              this.currentSource = source;
            });
          } else {
            this.$notify({
              title: 'Error',
              message: '语音合成失败',
              type: 'error'
            });
          }
        } catch (e) {
          ipcRenderer.send('buttonClick', "retry");
        }
      }
    },
    async read(text) {
      if (text === "") {
        this.$notify({
          title: 'Error',
          message: '你还未选中任何文字',
          type: 'error'
        });
      }
      try {
        const voiceConfig = {
          model: "zh-CN-XiaoxiaoNeural",
          content: text,
          mood: ""
        }
        const ssmlText = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="en-US">
                          <voice name="${voiceConfig.model}">
                              <mstts:express-as >
                                  ${voiceConfig.content}
                              </mstts:express-as>
                          </voice>
                          </speak>`;
        const response = await speaker.textToSpeech(ssmlText, voiceConfig);
        const buffer = response.data.buffer;  // Convert Node.js Buffer to ArrayBuffer
        if (response.status === "success") {
          let audioContext = new (window.AudioContext || window.webkitAudioContext)();
          await audioContext.decodeAudioData(buffer, (decodedData) => {
            // 如果有正在播放的音频，停止它
            if (this.currentSource) {
              this.currentSource.stop();
            }
            let source = audioContext.createBufferSource();
            source.buffer = decodedData;
            source.connect(audioContext.destination);
            source.start(0);
            // 将新的音频源保存为当前音频源
            this.currentSource = source;
          });
        } else {
          this.$notify({
            title: 'Error',
            message: '语音合成失败',
            type: 'error'
          });
        }
      } catch (e) {
        this.$notify({
          title: 'Error',
          message: '语音合成失败',
          type: 'error'
        });
      }
    },
    mountedInit() {
      let iframe = this.$refs.webview;
      iframe.addEventListener('did-finish-load', async () => {
        this.isLoaded = true;
        await this.check()
        // iframe.openDevTools();
        let data = await iframe.executeJavaScript(`
    (() => {
        const elements = document.getElementsByClassName('m-0 w-full resize-none border-0 bg-transparent py-[10px] pr-10 focus:ring-0 focus-visible:ring-0 dark:bg-transparent md:py-4')
        return elements.length;
      })()
    `);
        console.log(data)
        this.toolsView = data !== 0;
      });
      iframe.addEventListener('did-fail-load', () => {
        // 在加载失败后重新加载页面
        iframe.reload();
      });
      iframe.addEventListener('context-menu', (e) => {
        const remote = window.require('@electron/remote')
        e.preventDefault()
        const menu = new remote.Menu()
        menu.append(new remote.MenuItem({label: '复制', role: 'copy'}))
        menu.append(new remote.MenuItem({label: '粘贴', role: 'paste'}))
        menu.append(new remote.MenuItem({
          label: '选文朗读',
          click: async () => {
            // 在webview中执行JavaScript来获取当前选中的文本
            const selectedText = await iframe.executeJavaScript('window.getSelection().toString()')
            await this.read(selectedText)
          }
        }))
        menu.popup(remote.getCurrentWindow())
      })

      const {ipcRenderer} = window.require('electron');
      ipcRenderer.on('newmessage', async () => {
        console.log("newmessage")
        const script = `
(() => {
    let lastOuterText = null;
    let noChangeCount = 0;

    const checkOuterText = () => {
        const elementClass = 'relative flex w-[calc(100%-50px)] flex-col gizmo:w-full lg:w-[calc(100%-115px)] agent-turn';
        const elements = document.getElementsByClassName(elementClass);
        const element = elements[elements.length - 1];  // Get the last element
        if (element) {
            const currentOuterText = element.outerText;
            if (currentOuterText === undefined || currentOuterText === null || currentOuterText === '') {
                // If the current outerText is empty, keep polling and do not increment the noChangeCount
                return;
            }
            if (lastOuterText === currentOuterText) {
                noChangeCount += 1;
            } else {
                noChangeCount = 0;
                lastOuterText = currentOuterText;
            }

            if (noChangeCount >= 3) {  // adjust this value based on how long you want to wait for no changes
                clearInterval(window.myIntervalID);
                // Send the outerText back to your application here
                window.electron.sendEvent('outerTextChanged', lastOuterText);
            }
        }
    };

    window.myIntervalID = setInterval(checkOuterText, 1000);  // Check every second
})()
`;


        try {
          await this.$refs.webview.executeJavaScript(script);
          console.log('JavaScript successfully executed');
        } catch (error) {
          console.log('Error executing JavaScript:', error);
        }

      });


    },
    async playAudio() {
      const openScript = `
    (() => {
        window.myEventHandlers = {
            textareaEnterHandler: (event) => {
                if (event.key === 'Enter') {
                    window.electron.sendEvent('textareaEnter');
                }
            },
            buttonClickHandler: () => {
                window.electron.sendEvent('buttonClick');
            },
        };

        const checkElements = () => {

            const buttonClass = 'absolute p-1 rounded-md md:bottom-3 gizmo:md:bottom-2.5';

            const textarea = document.getElementById("prompt-textarea");

            const button = document.getElementsByClassName(buttonClass)[0];

            if (textarea) {
                textarea.removeEventListener('keydown', window.myEventHandlers.textareaEnterHandler);
                textarea.addEventListener('keydown', window.myEventHandlers.textareaEnterHandler);
            }

            if (button) {
                button.removeEventListener('click', window.myEventHandlers.buttonClickHandler);
                button.addEventListener('click', window.myEventHandlers.buttonClickHandler);
                clearInterval(window.myIntervalID);
            }
        };

        window.myIntervalID = setInterval(checkElements, 500);  // Check every 500ms
    })()
`;
      // eslint-disable-next-line no-unused-vars
      const closeScript = `
    (() => {
        const buttonClass = 'absolute p-1 rounded-md md:bottom-3 gizmo:md:bottom-2.5';

        const textarea = document.getElementById("prompt-textarea");

        const button = document.getElementsByClassName(buttonClass)[0];

        console.log(textarea);
        console.log(button);


        if (textarea) {
        console.log("removeEventListener")
            textarea.removeEventListener('keydown', window.myEventHandlers.textareaEnterHandler);
        }

        if (button) {
        console.log("removeEventListener2")
            button.removeEventListener('click', window.myEventHandlers.buttonClickHandler);
        }


        clearInterval(window.myIntervalID);
        return window.myIntervalID
    })()
`;


      try {
        if (!this.reader) {
          await this.$refs.webview.executeJavaScript(openScript);
          console.log("open")
          this.$notify({
            title: 'Success',
            message: '已开启朗读，每次对话后请等待3秒',
            type: 'success'
          });
          this.reader = true
        } else {
          const res = await this.$refs.webview.executeJavaScript(closeScript);
          console.log(res)
          console.log("close")
          this.reader = false
          this.$notify({
            title: 'Success',
            message: '已关闭朗读',
            type: 'success'
          });
        }
        console.log('JavaScript successfully executed');
      } catch (error) {
        console.log('Error executing JavaScript:', error);
      }
    },
    drawer_Upload() {
      this.$refs.uploader_page.loadData()
    },
    drawer_Setting() {
      this.$refs.setting_page.loadData()
    },
    async check() {
      this.clock = setInterval(async () => {
        let iframe = this.$refs.webview;
        let data = await iframe.executeJavaScript(`
    (() => {
      try {
        let theme = window.localStorage.getItem('theme');
        if(theme !== "${this.theme}") return theme;
      } catch (error) {
        // 错误在这里被捕获，你可以决定如何处理它
        console.log('Caught error: ', error);  // 你可以选择不输出错误
        return undefined;  // 返回一个默认值
      }
    })()
    `);
        if (typeof data !== "undefined") {
          this.theme = data;
        }
      }, 1000);

    },
    async DataContorl() {
      const existScript = `
        (()=>{
          const element = document.getElementsByClassName('p-4 justify-center text-base md:gap-6 md:py-6 m-auto')
          return element.length
      })()
      `;
      let exist = await this.$refs.webview.executeJavaScript(existScript)
      if (exist === 0) {
        return {title: "", content: ""}
      }

      const currentTitleScript = `
      (() => {
        const element = document.getElementsByClassName('flex p-3 items-center gap-3 relative rounded-md hover:bg-gray-100 cursor-pointer break-all bg-gray-100 dark:bg-gray-800 pr-14 dark:hover:bg-gray-800 group')
        let data=[]
        for(let i=0;i<element.length;i++){
          data.push(element[i].innerText)
        }
        return data;
      })()
    `;

      let ScriptPath = path.join(__dirname, 'preload', 'dataScript.js')

      if (process.env.NODE_ENV === 'development') {
        this.preload = 'file://' + path.join(process.cwd(), 'public', 'preload', 'dataScript.js');
      } else {
        this.preload = ScriptPath
      }

      const fs = require('fs');
      const dataScript = fs.readFileSync(ScriptPath, 'utf-8');





      let currenttitle = await this.$refs.webview.executeJavaScript(currentTitleScript)
      let data = await this.$refs.webview.executeJavaScript(dataScript)
      let currentTitle = currenttitle[0];
      return {title: currentTitle, content: data[0]}

    },
    async page_copy() {
      const {clipboard} = window.require('electron')
      let data = await this.DataContorl();
      console.log(data)
      if (data.content === "") {
        this.$message({
          message: '未检索到内容',
          type: 'error'
        })
        return
      }
      clipboard.writeText(data.content)
      this.$message({
        message: '复制成功',
        type: 'success'
      })

    },
    async page_download() {
      let data = await this.DataContorl();
      console.log(data)
      if (data.content === "") {
        this.$message({
          message: '未检索到内容',
          type: 'error'
        })
        return
      }
      const path = window.require('path')
      const os = window.require('os');
      const homeDir = os.homedir();
      const {dialog} = window.require('@electron/remote')
      dialog.showSaveDialog({
        title: '选择表格保存文件夹',
        defaultPath: path.join(homeDir, "desktop", data.title),
        buttonLabel: '保存',
        filters: [{name: 'Markdown', extensions: ['md']}]
      }).then(res => {
        if (res.canceled === false) {
          const fs = window.require('fs')
          fs.writeFile(res.filePath, data.content, (err) => {
            if (err) {
              this.$message({
                showClose: true,
                message: '保存失败',
                type: 'error'
              });
            } else {
              this.$message({
                showClose: true,
                message: '保存成功',
                type: 'success'
              });
            }
          });
        } else {
          this.$message({
            showClose: true,
            message: '用户已取消下载操作',
            type: 'info'
          });
        }
      })

    },
    page_refresh(mode = "normal") {
      clearInterval(this.clock)
      this.$refs.webview.reload()
      if(mode === "normal") {
        this.$message({
          message: '刷新成功',
          type: 'success'
        })
      }
        this.toolsView = true
    },
    page_top() {
      const {ipcRenderer} = window.require('electron');
      ipcRenderer.send('toggle-always-on-top');
    },
    cache_clear() {
      const {session} = window.require('@electron/remote')
      session.defaultSession.clearStorageData().then(() => {
        this.$message({
          message: '清除缓存成功',
          type: 'success'
        })
        this.page_refresh("cache_clear")
      }).catch(() => {
        this.$message({
          message: '清除缓存失败',
          type: 'error'
        })
      });

    }

  }
}
</script>


<style scoped>
.container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.tools {
  position: fixed;
  top: 1.6vh;
  right: 4.5vw;
}

.aside_tools {
  position: fixed;
  top: 15vh;
  right: 1.1vw;
  flex-direction: column;
}


.skeleton {
  padding: 10px;
  display: inline
}

.footer {
  position: fixed;
  bottom: 1.2vh;
  right: 1vw;
}

.text {
  font-size: 14px;
}

.item {
  margin-bottom: 18px;
}

.clearfix:before,
.clearfix:after {
  display: table;
  content: "";
}

.clearfix:after {
  clear: both
}

.table-container {
  height: 50%;
  overflow: auto;
}

.box-card {
  width: 100%
}

.upload-container {
  width: 100%;
  margin-top: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.upload-progress {
  margin-top: 20px;
  padding: 0 10px;
  display: flex;
  align-items: center;
}

.upload-progress span {
  margin-right: 10px;
}
</style>

