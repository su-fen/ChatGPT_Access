<template>
  <div>
    <el-drawer
        direction="rtl"
        :modal-append-to-body="false"
        size="40%"
        :with-header="false"
        :visible.sync="localVisual"
    >
      <div class="block">
        <el-timeline>
          <el-timeline-item timestamp="基础设置" placement="top">
            <el-card>
              <el-switch
                  style="display: block"
                  v-model="normalSetting.autoStartEnabled"
                  active-color="#13ce66"
                  inactive-color="#ff4949"
                  active-text="开机自启"
              >
              </el-switch>
              <div style="margin-top:10px">
                <span>Tips：目前快速显隐快捷键为 <span style="color:red">Ctrl+o</span> ,暂不支持自定义</span>
              </div>

            </el-card>
          </el-timeline-item>
          <el-timeline-item timestamp="快捷翻译（Beta） 已遗弃" placement="top">
            <el-card>
              <el-switch
                  style="display: block"
                  v-model="translateSetting.translateEnabled"
                  active-color="#13ce66"
                  inactive-color="#ff4949"
                  active-text="开关"
              >
              </el-switch>
              <div class="option_container">
                <span>Apikey:</span>
                <el-input v-model="translateSetting.apikey" placeholder="请输入Apikey" clearable></el-input>
                <el-button type="primary" @click="translate_TokenGet"><i class="el-icon-s-promotion"></i>一键获取
                </el-button>
              </div>
              <div class="option_container">
                <span>Endpoint:</span>
                <el-input v-model="translateSetting.endPoint" placeholder="请输入节点地址" clearable></el-input>
              </div>
              <div class="option_container">
                <span>SystemPrompt:</span>
                <el-input v-model="translateSetting.systemPrompt" placeholder="请输入系统提示词" clearable></el-input>
              </div>
              <div class="option_container">
                <span>PrePrompt:</span>
                <el-input v-model="translateSetting.prePrompt" placeholder="请输入前置提示词" clearable></el-input>
              </div>
              <div class="option_container" style="display:inline-block">
                <span>Model:</span>
                <el-select v-model="translateSetting.model.value" placeholder="请选择">
                  <el-option
                      v-for="item in translateSetting.model.options"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value">
                  </el-option>
                </el-select>
              </div>
              <div style="margin-top:10px">
                <span>Tips：目前快捷键为 <span style="color:red">Ctrl+m</span> ,暂不支持自定义</span>
                <br>
                <span>Tips：一般用户只需点击"一键获取"，然后右下角应用即可</span>
                <br>
                <span>Tips：如果你登录的是Plus账号，请选择GPT4模型</span>
                <br>
                <span>使用方法：在任意程序选取一段文字按快捷键即可！</span>
              </div>
            </el-card>
          </el-timeline-item>


        </el-timeline>
      </div>
      <div class="button-container">
        <el-button type="primary" @click="Save"><i class="el-icon-s-promotion"></i>应用</el-button>
      </div>
    </el-drawer>
  </div>
</template>

<script>
import axios from "axios";
import querystring from "querystring";
import global from "@/init/global";

const {ipcRenderer} = window.require('electron')

export default {
  name: 'setting_page',
  data() {
    return {
      localVisual: false,
      normalSetting: {
        autoStartEnabled: false
      },
      translateSetting: {
        translateEnabled: false,
        apikey: "",
        endPoint: "",
        systemPrompt: "",
        prePrompt: "",
        model: {
          options: [{
            value: 'gpt-3.5-turbo-16k',
            label: 'GPT-3.5-turbo-16k'
          }, {
            value: 'gpt-4',
            label: 'GPT-4'
          }],
          value: 'gpt-3.5-turbo-16k'
        }
      }
    }
  },
  created() {
    ipcRenderer.on('setting', (event, arg) => {
      if (arg.message === 'autoStart') {
        this.normalSetting.autoStartEnabled = arg.action.enabled
      }
    })
  },
  methods: {
    async loadData() {
      const store = global.Store("config")
      this.normalSetting.autoStartEnabled = await this.autoStart_Getter()
      //Translate_option
      this.translateSetting.translateEnabled = store.get("translateOption.translateEnabled") === 'true' || false;
      this.translateSetting.apikey = store.get("translateOption.apikey")
      this.translateSetting.endPoint = store.get("translateOption.endPoint")
      this.translateSetting.systemPrompt = store.get("translateOption.systemPrompt")
      this.translateSetting.prePrompt = store.get("translateOption.prePrompt")
      this.translateSetting.model.value = store.get("translateOption.model")

      this.localVisual = !this.localVisual;

    },
    autoStart_Getter() {
      ipcRenderer.send('setting', {
        message: "autoStart",
        action: {type: "getter", enabled: this.normalSetting.autoStartEnabled}
      })

    },
    autoStart_Setter() {
      ipcRenderer.send('setting', {
        message: "autoStart",
        action: {type: "setter", enabled: this.normalSetting.autoStartEnabled}
      })


    },
    Save() {
      this.autoStart_Setter()
      this.$notify({
        title: 'Success',
        message: '设置已保存并应用',
        type: 'success'
      });
      //Translate_option
      const store = global.Store("config")
      store.set("translateOption.translateEnabled", String(this.translateSetting.translateEnabled))
      store.set("translateOption.apikey", this.translateSetting.apikey || "")
      store.set("translateOption.endPoint", this.translateSetting.endPoint || "")
      store.set("translateOption.systemPrompt", this.translateSetting.systemPrompt || "")
      store.set("translateOption.prePrompt", this.translateSetting.prePrompt || "")
      store.set("translateOption.model", this.translateSetting.model.value || "")
      ipcRenderer.send('update', {})



      this.$notify({
        title: 'Success',
        message: '设置已保存并应用',
        type: 'success'
      });
      this.localVisual = !this.localVisual
    },
    translate_TokenGet() {
      const {session} = window.require('@electron/remote')
      session.defaultSession.cookies.get({url: 'https://chat.xf233.com'})
          .then((cookies) => {
            console.log(cookies)
            const cookie = cookies.find(v => v.name === "access-token")
            const accesstoken = cookie.value
            const data = querystring.stringify({
              unique_name: 'FK',
              access_token: accesstoken,
              expires_in: '0',
              site_limit: '',
              show_conversations: 'true',
            });

            axios.post('https://ai.fakeopen.com/token/register', data, {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
            }).then(res => {
              this.translateSetting.apikey = res.data.token_key
              this.translateSetting.endPoint = "https://ai.fakeopen.com/v1/chat/completions"
              this.$notify({
                title: 'Success',
                message: '获取成功',
                type: 'success'
              });
            }).catch(() => {
              this.$notify({
                title: 'Error',
                message: '获取失败',
                type: 'error'
              });
            })
          }).catch(() => {
        this.$notify({
          title: 'Error',
          message: '获取失败',
          type: 'error'
        });
      })
    }

  }
}
</script>

<style scoped>
.block {
  padding-top: 20px;
  display: block;
  padding-right: 10px; /* 可以根据需要调整 */

  overflow: auto;
}

/deep/ .el-timeline-item__timestamp.is-top {
  font-size: 18px !important; /* 你可以根据需要调整这个值 */
  color: black
}

.button-container {
  position: fixed; /* 让按钮脱离文档流，固定于视口 */
  bottom: 20px; /* 与视口底部的距离，可以根据需要调整 */
  right: 20px; /* 与视口右侧的距离，可以根据需要调整 */
}

.option_container {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  align-items: center;
}

.option_container > * {
  margin-right: 10px; /* or any other value you want */
}

.option_container > span {
  text-align: center
}

.option_container > *:last-child {
  margin-right: 0;
}


</style>
