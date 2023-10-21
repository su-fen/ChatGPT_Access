<template>
  <div>
    <div class="tool_bar">
      <el-input
          placeholder="请输入内容"
          v-model="input"
          clearable>
      </el-input>
      <div class="button_container">
        <el-button class="btn" type="primary" icon="el-icon-search" circle @click="search"></el-button>
<!--        <el-button class="btn" type="primary" icon="el-icon-refresh" circle></el-button>-->
      </div>

    </div>
    <div class="divider"></div>
    <div class="input_container">
      <el-input
          class="input"
          type="textarea"
          :rows="6"
          resize="none"
          :autosize="{ minRows: 6, maxRows: 6 }"
          placeholder="请输入内容"
          v-model="result">
      </el-input>
    </div>
  </div>
</template>

<script>
import global from "@/init/global";

export default {

  name: "translate_page",
  data() {
    return {
      input: "",
      result: "",
      searchTask: null,
      option: {
        apikey: "",
        endPoint: "",
        systemPrompt: "",
        prePrompt: "",
        model: "",
      }
    }
  },
  created() {
    this.loadData()
    const {ipcRenderer} = window.require('electron');
    ipcRenderer.on('translate_message', (event, message) => {
      this.input = this.option.prePrompt || "" + message;
      this.search()
    });
    ipcRenderer.on('message', (event, message) => {
      if (message.type === "update") {
        this.loadData()
      }
    });
  },
  methods: {
    loadData() {
      const store = global.Store("config")
      this.option = store.get("translateOption")
      console.log(this.option)
      if(this.option.endPoint==="https://ai.fakeopen.com/v1/chat/completions"){
        this.option.model="gpt-3.5-turbo"
      }
    },
    search() {
      // 如果有正在运行的搜索任务，取消它
      if (this.searchTask) {
        this.searchTask.abort();
      }

      // 创建一个新的 AbortController，并保存为当前的搜索任务
      this.searchTask = new AbortController();

      this.result = "";
      console.log(this.option.endPoint)
      fetch(this.option.endPoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.option.apikey}`
        },
        body: JSON.stringify({
          model: this.option.model,
          messages: [
            {
              role: "system",
              content: this.option.systemPrompt
            },
            {
              role: "user",
              content: "Translate the text to Chinese or English：\n\n"+this.input
            }
          ],
          temperature: 0,
          stream: true
        }),
        signal: this.searchTask.signal  // 添加这行，将 fetch 任务关联到 AbortController
      }).then(response => {
        if(response.status === 429){
          if (this.searchTask) {
            this.searchTask.abort();
          }
          setTimeout(() =>{
            this.search()
          },1000)
          return
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let chunk = '';
        const processStream = ({done, value}) => {
          if (done || this.searchTask.signal.aborted) {
            return;
          }

          chunk += decoder.decode(value);
          if (chunk.indexOf('\n\n') !== -1) {
            const parts = chunk.split('\n\n');
            chunk = parts.pop();
            parts.forEach(data => {
              data = data.trim().split('data: ')[1]
              if (data === "[DONE]") {
                return;
              }
              data = JSON.parse(data)
              this.result += data.choices[0]?.delta?.content ?? '';
            });
          }
          return reader.read().then(processStream);
        };
        return reader.read().then(processStream);
      }).catch(error => {
        console.log(error)
        if (error.name === 'AbortError') {
          console.log('Search aborted');
        } else {
          console.error(error);
        }
      });
    }



  }
}

</script>


<style scoped>
body {
//-webkit-app-region: drag; width: 100%; height: 100%; margin: 0;
  padding: 2px;
  box-sizing: border-box;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

.button_container {
  -webkit-app-region: drag;
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
  height: 100%;

  padding-right: 10px;
  padding-left: 10px;


}

.btn {
  -webkit-app-region: no-drag;
}

.tool_bar {
  -webkit-app-region: no-drag;
  height: 20%;
  width: 100%;
  display: flex;
}

.input_container {
  -webkit-app-region: no-drag;
  height: 80%;
  width: 100%;
  overflow: hidden;
}

.divider {
  -webkit-app-region: no-drag;
  margin: 5px 0; /* 调整分割线上下间距 */
  height: 1px; /* 调整线条高度 */
  background-color: #d3d3d3; /* 设置线条颜色为淡灰色 */
  width: 100%; /* 使分割线横向占满浏览器 */
}

body,
.tool_bar,
.input_container,
.divider {
  box-sizing: border-box;
}


</style>
