# 快速启动和测试指南

## 🚀 启动应用

### 前提条件
确保已安装Node.js和npm/pnpm：
```bash
node --version  # 应该 >= 16
npm --version   # 或 pnpm --version
```

### 安装依赖（首次运行）
```bash
cd /data/workspace/aicli-hub
npm install
# 或
pnpm install
```

### 启动开发环境
```bash
npm run dev
```

这将启动：
1. Vite开发服务器（前端）
2. Electron应用（桌面窗口）

等待几秒钟，应用窗口会自动打开。

## 🧪 快速验证修复

### 1分钟快速测试

1. **选择CLI工具**
   - 在欢迎界面的下拉框中选择一个可用的CLI（如Claude）
   
2. **选择工作目录**
   - 点击"选择目录"按钮
   - 选择任意目录（如 `/tmp` 或项目目录）

3. **开始会话**
   - 点击"开始会话"按钮
   - 等待终端窗口出现

4. **测试连续命令** ⭐ 关键测试
   ```
   第一条命令: hello
   等待响应完成（按钮变为可用）
   
   第二条命令: what is 1+1?
   等待响应完成
   
   第三条命令: tell me a joke
   等待响应完成
   ```

5. **验证结果**
   - ✅ 所有三条命令都能正常执行
   - ✅ 每条命令执行完成后，输入框恢复可用
   - ✅ 所有输出都正确显示在终端区域
   - ✅ 没有卡顿或冻结

### 观察要点

#### 正常行为 ✅
- 命令发送后，执行按钮变为"中断"
- CLI返回输出时，终端区域实时更新
- 出现提示符（如 `>`）后，按钮立即恢复为"执行"
- 可以立即发送下一个命令

#### 异常行为 ❌（如果出现，说明有问题）
- 第二个命令发送后无响应
- 执行按钮一直显示"中断"状态
- 输入框一直处于禁用状态
- 控制台出现错误信息

## 🔍 调试工具

### 打开开发者工具
在Electron窗口中按 `F12` 或 `Ctrl+Shift+I`（Windows/Linux）或 `Cmd+Option+I`（macOS）

### 查看状态
在Console中输入：
```javascript
// 获取当前store状态
const state = require('./src/renderer/store/app-store').useAppStore.getState()

// 查看关键状态
console.log({
  isRunning: state.task.isRunning,
  hasTimer: !!state.sessionIdleTimer,
  sessionId: state.currentSessionId,
  outputLength: state.sessionOutput.length
})
```

### 监听状态变化
```javascript
require('./src/renderer/store/app-store').useAppStore.subscribe(
  (state) => {
    console.log('State Update:', {
      isRunning: state.task.isRunning,
      timestamp: new Date().toISOString()
    })
  }
)
```

## 📊 测试检查清单

完成以下检查，确认修复成功：

- [ ] 应用成功启动
- [ ] 可以选择CLI工具
- [ ] 可以选择工作目录
- [ ] 可以开始会话
- [ ] **第一个命令可以执行** ✅
- [ ] **第二个命令可以执行** ⭐ 核心验证
- [ ] **第三个命令可以执行** ⭐ 核心验证
- [ ] 命令执行完成后状态正确重置
- [ ] 可以点击"中断"按钮
- [ ] 可以关闭会话
- [ ] 会话记录出现在历史列表中
- [ ] 控制台无错误信息

## 🎯 成功标准

### ✅ 修复成功的标志
1. 可以在同一会话中连续发送**至少3个命令**
2. 每个命令都能得到正常响应
3. 状态在每次命令完成后正确重置
4. 界面流畅，无卡顿

### ❌ 需要进一步排查的情况
1. 第二个命令发送后无反应
2. 控制台出现JavaScript错误
3. 状态`isRunning`一直为`true`
4. 计时器未被清理（内存持续增长）

## 🐛 如果测试失败

### 场景1：命令无响应
**症状**：发送第二个命令后没有任何输出

**检查**：
1. 打开开发者工具，查看Console是否有错误
2. 检查`task.isRunning`的值
3. 检查`sessionIdleTimer`是否存在

**可能原因**：
- 提示符检测失败且超时未触发
- 监听器未正确注册

### 场景2：超时不工作
**症状**：3秒后状态仍未重置

**检查**：
1. 确认代码修改已生效（刷新应用）
2. 检查是否有JavaScript语法错误
3. 查看计时器是否被创建

### 场景3：内存泄漏
**症状**：多次创建/关闭会话后，内存持续增长

**检查**：
1. 使用Chrome DevTools的Memory标签
2. 拍摄Heap Snapshot
3. 查找残留的计时器或监听器

## 📞 获取帮助

如果遇到问题：

1. **查看详细文档**：
   - `TESTING_GUIDE.md` - 完整测试指南
   - `BUG_FIX_DOCUMENTATION.md` - 技术细节
   - `FIX_SUMMARY.md` - 修复总结

2. **收集信息**：
   - 截图或录屏
   - 开发者工具的Console输出
   - 复现步骤

3. **报告问题**：
   创建Issue，包含：
   - 环境信息（OS、Node版本）
   - 详细的复现步骤
   - 错误截图和日志

## 💡 提示

- **清除缓存**：如果修改未生效，尝试完全重启应用
- **查看网络**：某些CLI可能需要网络连接
- **权限问题**：确保选择的工作目录有读写权限
- **CLI可用性**：确保选择的CLI工具已正确安装

## ⚡ 性能测试（可选）

如果想测试性能：

1. **连续发送多个命令**（10个以上）
2. **发送产生大量输出的命令**
3. **创建和关闭多个会话**（10次以上）
4. **长时间运行**（30分钟以上）

观察：
- 响应速度是否下降
- 内存使用是否异常增长
- 是否出现卡顿

---

**预计测试时间**: 5-10分钟  
**难度**: ⭐⭐☆☆☆（简单）  
**重要性**: ⭐⭐⭐⭐⭐（非常重要）
