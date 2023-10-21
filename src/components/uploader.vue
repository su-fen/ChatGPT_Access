<template>
<div>
  <el-drawer
      direction="rtl"
      :modal-append-to-body="false"
      size="40%"
      :with-header="false"
      :visible.sync="localVisual"
  >
    <el-card class="box-card">
      <div slot="header" class="clearfix">
        <span>注意事项：</span>
      </div>
      <div class="text item">1. 您上传的文件最多留存一周时间，一周时间后将会自动清理</div>
      <div class="text item">2. 单次上传只支持上传<span style="color:red">15MB</span>大小以内的文件</div>
      <div class="text item">3. 上传后获得的链接可用于<span style="color:red">Link Reader等插件</span></div>
      <div class="text item">3. 请不要大批量上传，此功能仅为配合GPT Plus的Plugin一起使用</div>
    </el-card>
    <div class="table-container">
      <el-table
          :data="tableData"
          border
          style="width: 100%">
        <el-table-column
            align="center"
            prop="filename"
            label="文件名"
        >
        </el-table-column>
        <el-table-column
            align="center"
            prop="url"
            label="文件链接"
            :show-overflow-tooltip="true"
        >
        </el-table-column>
        <el-table-column
            align="center"
            fixed="right"
            label="操作"
        >
          <template slot-scope="scope">
            <el-button @click="link_copy(scope.row)" type="primary" size="small">复制链接</el-button>
            <el-button @click="link_del(scope.row)" type="danger" size="small">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
    <div class="upload-container">
      <el-button type="primary" size="small" @click="file_upload">上传文件</el-button>
      <el-button type="primary" size="small" @click="file_delete">清空记录</el-button>
    </div>
  </el-drawer>
</div>
</template>

<script>
import tools from "@/utils/tools";

export default {
  name: 'uploader_page',
  data () {
    return {
      tableData: [],
      localVisual:false
    }
  },

  methods:{
    link_copy(data) {
      const {clipboard} = window.require('electron')
      clipboard.writeText(data.url)
      this.$message({
        message: '复制成功!',
        type: 'success'
      });
    },
    link_del(data) {
      let uuid = data.uuid
      this.tableData = this.tableData.filter(item => item.uuid !== uuid)
      localStorage.setItem('data', JSON.stringify(this.tableData))
      this.$notify({
        title: 'Success',
        message: '已删除该条记录',
        type: 'success'
      });
    },
    async loadData() {
      const data = localStorage.getItem('data')
      if (data) {
        this.tableData = JSON.parse(data)
      }
      this.localVisual = !this.localVisual
    },
    async file_upload() {
      const {dialog} = window.require('@electron/remote');
      const OSS = window.require('ali-oss');
      const path = window.require('path');
      const fs = window.require('fs');
      const client = new OSS({

      });
      const result = await dialog.showOpenDialog({properties: ['openFile']});

      if (!result.canceled) {
        const filePath = result.filePaths[0];
        const fileName = path.basename(filePath);
        // 获取文件大小
        const stats = fs.statSync(filePath);
        const fileSizeInBytes = stats.size;
        const fileSizeInMegabytes = fileSizeInBytes / (1024 * 1024);

        // 检查文件大小
        if (fileSizeInMegabytes > 15) {
          this.$notify.error({
            title: '上传失败',
            message: '文件大小超过15MB!',
          });
          return;
        }
        try {
          let progress = (p) => {
            return function (done) {
              console.log('Progress: ' + p);
              done();
            }
          };
          let temp = Date.now().toString()
          let result = await client.multipartUpload("/chatgpt_file/" + temp + "_" + fileName, filePath, {
            progress: progress
          });
          if (result.res.statusCode === 200) {
            this.$notify({
              title: '上传成功',
              message: '文件已上传至云空间!',
              type: 'success'
            });
            const uuid = tools.generateUUID()
            this.tableData.push({uuid: uuid, filename: fileName, url: "https://cdn.xf233.com" + result.name});
            localStorage.setItem('data', JSON.stringify(this.tableData))
          }
        } catch (error) {
          console.log(error)
          this.$notify.error({
            title: '上传失败',
            message: '文件上传失败!',
          });
        }
      }
    },
    file_delete() {
      this.tableData = []
      localStorage.removeItem('data')
      this.$notify({
        title: 'Success',
        message: '已删除所有本地记录！',
        type: 'success'
      });
    },
  }
}

</script>

<style scoped>
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
