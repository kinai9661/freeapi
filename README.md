📝 Typli API 终极版 - 项目介绍
项目概述
Typli API 终极版 是一个基于 Cloudflare Workers 的全功能 AI 聊天与图像生成平台，提供 OpenAI 兼容的 API 接口。项目集成了多个顶尖 AI 模型，包括 Grok-4、GPT-5、Claude Haiku、Gemini 2.5 和 DeepSeek 等聊天模型，以及 FLUX 2、Nano Banana 和 Stable Diffusion v3.5 等图像生成模型。

✨ 核心特性
💬 AI 聊天功能
10+ 顶尖模型：支持 Grok-4 Fast、GPT-5、Claude Haiku 4.5、Gemini 2.5 Flash 等

流式输出：实时显示 AI 回复，提供流畅的对话体验

文件上传：支持图片、PDF、代码等多种格式文件（单个最大 10MB）

对话管理：自动保存历史记录，支持切换、导出和删除对话

固定布局：聊天区域固定 800px 宽度，提供最佳阅读体验

🎨 AI 图像生成
5种专业模型：FLUX 2/Pro、Nano Banana/Pro、Stable Diffusion v3.5

12种风格预设：真实照片、日本动漫、油画、3D渲染、赛博朋克等

智能质量增强：6个可选质量标签，自动提升图像品质

批量生成：支持一次生成 1/2/4 张图片

历史记录：自动保存最近 50 张生成的图片

🔌 OpenAI 兼容 API
标准接口：完全兼容 OpenAI API 格式

统一调用：聊天和图像生成使用相同的 API 端点

流式传输：支持 Server-Sent Events (SSE) 流式响应

跨域支持：内置 CORS 处理，可从任意域名调用

🏗️ 技术架构
前端技术
纯 HTML/CSS/JS：无需构建工具，单文件部署

响应式设计：完美适配桌面、平板和移动设备

深色/浅色主题：支持主题切换，护眼舒适

Markdown 渲染：使用 marked.js 渲染富文本

代码高亮：使用 highlight.js 实现语法高亮

后端技术
Cloudflare Workers：边缘计算，全球加速

零依赖：纯原生 JavaScript，无需外部库

流式代理：TransformStream 实现流式数据转发

本地存储：localStorage 保存用户数据

API 设计
text
基础地址: https://your-worker.workers.dev/v1

端点:
- GET  /v1/models              获取模型列表
- POST /v1/chat/completions    聊天/图像生成
🚀 部署方式
1. Cloudflare Workers 部署（推荐）
bash
# 1. 登录 Cloudflare Dashboard
# 2. 创建新 Worker
# 3. 粘贴完整代码
# 4. 部署并获取域名
2. 环境变量配置
javascript
API_MASTER_KEY="your-secret-key"  // 可选，默认为 "1"
📦 功能模块
聊天模块
新建/切换/删除对话

实时流式输出

文件上传（图片/文档/代码）

Markdown 渲染

代码语法高亮

复制/导出消息

图像模块
模型选择（5种）

风格预设（12种）

质量增强（6个标签）

批量生成（1/2/4张）

图片预览/下载

历史记录管理

API 模块
接口文档展示

API 密钥管理

OpenAI 兼容调用

🎯 使用场景
个人 AI 助手：日常对话、问题解答、创意写作

开发工具：代码生成、调试辅助、技术咨询

内容创作：文章撰写、图片生成、素材制作

学习研究：知识问答、学术讨论、资料整理

API 服务：为其他应用提供 AI 能力

🔐 安全特性
API 密钥认证：可选的 Bearer Token 验证

CORS 跨域：安全的跨域资源共享

内容过滤：已移除敏感内容选项

数据隔离：用户数据仅存储在浏览器本地

📊 性能优化
代码压缩：JavaScript 代码压缩至最小体积

边缘计算：利用 Cloudflare 全球节点加速

流式传输：降低首字延迟，提升响应速度

本地缓存：历史记录本地存储，快速加载

🌐 浏览器兼容
✅ Chrome 90+

✅ Firefox 88+

✅ Safari 14+

✅ Edge 90+

✅ 移动端浏览器

📄 开源协议
本项目采用 MIT License 开源协议，可自由使用、修改和分发。

👨‍💻 作者信息
开发者：kinai9661

版本：5.3.2

GitHub：github.com/kinai9661

🔄 版本历史
v5.3.2 (2025-12-10)

✅ 移除成人内容选项

✅ 优化图像生成逻辑

✅ 修复质量增强功能

v5.3.1 (2025-12-10)

✅ 修复图像生成失败问题

✅ 改进提示词处理

✅ 优化自然语言描述

v5.3.0 (2025-12-09)

✅ 新增图像历史记录

✅ 添加质量增强标签

✅ 优化 UI 布局

🆘 常见问题
Q: 如何修改 API 密钥？
A: 在 Cloudflare Workers 环境变量中设置 API_MASTER_KEY

Q: 支持哪些文件格式？
A: 图片（JPG/PNG/GIF）、文档（PDF/TXT/DOC）、代码（JS/PY/JSON/HTML）

Q: 如何批量生成图片？
A: 在图像工作室中选择"批量生成"，支持 1/2/4 张

Q: 历史记录保存在哪里？
A: 保存在浏览器的 localStorage，最多保存 50 条记录

Q: 可以自定义样式吗？
A: 可以，修改代码中的 CSS 变量即可自定义主题颜色

🎉 特别鸣谢
感谢以下开源项目的支持：

Cloudflare Workers

marked.js

highlight.js

Typli.ai

📞 联系方式
如有问题或建议，欢迎通过以下方式联系：

GitHub Issues

Email: [your-email]

Discord: [your-discord]

🌟 如果这个项目对你有帮助，欢迎 Star ⭐ 支持！
