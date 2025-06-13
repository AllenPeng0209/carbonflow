# ModelSelector 本地Gemma集成指南

## 概览

ModelSelector现在支持两种方式运行Gemma模型：
1. **云端模式** - 通过OpenRouter调用Gemma3 27B和Gemini模型
2. **本地模式** - 通过Ollama在本地运行Gemma模型

## 功能特性

### ✅ 已实现功能
- 🌐 OpenRouter云端Gemma/Gemini模型支持
- 🏠 Ollama本地Gemma模型支持 
- 🔄 智能提供商切换
- 🛡️ 隐私保护提示（本地模式）
- 📊 按提供商分组显示模型
- ⚠️ 详细的错误提示和安装指导

### 🎯 核心改进
- 修复了所有linter错误（CRLF → LF）
- 支持动态模型检测
- 增强的用户体验和视觉提示

## 安装和配置指南

### 1. 配置OpenRouter（云端模式）
```bash
# 在设置中配置OpenRouter API Key
# 或设置环境变量
export OPEN_ROUTER_API_KEY="your_api_key_here"
```

### 2. 安装配置Ollama（本地模式）

#### 2.1 安装Ollama
```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows
# 下载并安装 https://ollama.com/download
```

#### 2.2 启动Ollama服务
```bash
ollama serve
```

#### 2.3 下载Gemma模型
```bash
# 下载不同规格的Gemma模型
ollama pull gemma:2b      # 2B参数版本（约1.7GB）
ollama pull gemma:7b      # 7B参数版本（约5.2GB）  
ollama pull gemma:13b     # 13B参数版本（约7.4GB）

# 查看已安装的模型
ollama list
```

### 3. 在应用中启用Ollama
1. 打开设置页面
2. 转到 "Providers" → "Local Providers" 
3. 启用Ollama提供商
4. 确认API基地址为 `http://127.0.0.1:11434`

## 使用方式

### 选择模型
ModelSelector会自动检测可用的模型并按提供商分组：

```
┌─ OpenRouter (云端) ─┐
│ ├─ Gemma3 27B      │
│ ├─ Gemini Pro 1.5   │
│ └─ Gemini Flash 1.5 │
└──────────────────────┘

┌─ Ollama (本地) ─┐
│ ├─ gemma:2b    │
│ ├─ gemma:7b    │  
│ └─ gemma:13b   │
└─────────────────┘
```

### 智能切换
- 当选择不同提供商的模型时，系统会自动切换对应的Provider
- 本地模式会显示 "本地运行" 标识和隐私保护提示

## 故障排除

### 常见问题

#### 1. "未找到支持的模型提供商或模型"
**可能原因：**
- OpenRouter API Key未配置
- Ollama服务未运行
- 未安装Gemma模型

**解决方案：**
```bash
# 检查Ollama状态
ollama list
curl http://127.0.0.1:11434/api/version

# 重新安装模型
ollama pull gemma:7b
```

#### 2. 本地模型不显示
**检查项：**
- [ ] Ollama是否在运行？
- [ ] 端口11434是否被占用？
- [ ] 模型是否正确安装？

```bash
# 检查端口
netstat -an | grep 11434

# 重启Ollama
ollama serve
```

#### 3. 模型切换不生效
- 检查控制台是否有错误
- 确认Provider配置正确
- 重启应用程序

## 性能对比

| 模式 | 优点 | 缺点 | 适用场景 |
|------|------|------|---------|
| **云端 (OpenRouter)** | • 无需本地资源<br>• 最新模型版本<br>• 高性能 | • 需要网络<br>• 数据上传云端<br>• 可能有费用 | 追求最新功能 |
| **本地 (Ollama)** | • 完全离线<br>• 数据隐私<br>• 无API费用 | • 占用本地资源<br>• 需要GPU加速<br>• 设置复杂 | 隐私敏感场景 |

## 开发者说明

### 代码结构
```typescript
// 主要改动
const supportedProviders = providerList.filter(p => 
  p.name === 'OpenRouter' || p.name === 'Ollama'
);

const allowedModels = modelList.filter(m => {
  if (m.provider === 'OpenRouter') {
    return isGemmaOrGemini(m.name);
  } else if (m.provider === 'Ollama') {
    return m.name.toLowerCase().includes('gemma');
  }
  return false;
});
```

### 扩展支持
要添加更多本地模型支持，修改allowedModels过滤逻辑：

```typescript
// 例如添加Llama支持
else if (m.provider === 'Ollama') {
  return m.name.toLowerCase().includes('gemma') || 
         m.name.toLowerCase().includes('llama');
}
```

## 更新日志

### v1.1.0 (当前版本)
- ✅ 集成Ollama本地Gemma模型支持
- ✅ 修复所有linter错误
- ✅ 改进UI/UX设计
- ✅ 添加隐私保护提示
- ✅ 智能提供商切换
- ✅ 按提供商分组显示

### v1.0.0 (原版本)
- ✅ 基础OpenRouter Gemma/Gemini支持 