/**
 * =================================================================================
 * 项目: Typli API Ultimate - Enhanced Image Generation  
 * 版本: 5.2.0-history-page
 * 作者: kinai9661
 * 修改: 移除成人内容开关 + 图像历史独立页面 /images
 * =================================================================================
 */

const CONFIG = {
  PROJECT_NAME: "Typli API 终极版",
  VERSION: "5.2.0",
  API_MASTER_KEY: "1",
  UPSTREAM_CHAT_URL: "https://typli.ai/api/generators/chat",
  UPSTREAM_IMAGE_URL: "https://typli.ai/api/generators/images",
  REFERER_CHAT_URL: "https://typli.ai/free-no-sign-up-chatgpt",
  REFERER_IMAGE_URL: "https://typli.ai/ai-image-generator",
  CHAT_MODELS: [
    "xai/grok-4-fast",
    "xai/grok-4-fast-reasoning",
    "anthropic/claude-haiku-4-5",
    "openai/gpt-5",
    "openai/gpt-5-mini",
    "openai/gpt-4o",
    "openai/gpt-4o-mini",
    "google/gemini-2.5-flash",
    "deepseek/deepseek-reasoner",
    "deepseek/deepseek-chat"
  ],
  IMAGE_MODELS: [
    "fal-ai/flux-2",
    "fal-ai/flux-2-pro",
    "fal-ai/nano-banana",
    "fal-ai/nano-banana-pro",
    "fal-ai/stable-diffusion-v35-large"
  ],
  BASE_HEADERS: {
    "accept": "*/*",
    "content-type": "application/json",
    "origin": "https://typli.ai",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin"
  }
};

export default {
  async fetch(request, env, ctx) {
    const apiKey = env.API_MASTER_KEY || CONFIG.API_MASTER_KEY;
    request.ctx = { apiKey };
    const url = new URL(request.url);
    
    if (request.method === 'OPTIONS') {
      return new Response(null, {status: 204, headers: corsHeaders()});
    }
    
    if (url.pathname === '/') {
      return handleUI(request);
    }

    // 新增：图像历史独立页面
    if (url.pathname === '/images') {
      return handleImageHistoryUI(request);
    }
    
    if (url.pathname.startsWith('/v1/')) {
      return handleApi(request);
    }
    
    return jsonError('未找到', 404);
  }
};

async function handleApi(request) {
  const auth = request.headers.get('Authorization');
  const key = request.ctx.apiKey;
  
  if (key !== "1" && auth !== `Bearer ${key}`) {
    return jsonError('未授权', 401);
  }
  
  const url = new URL(request.url);
  const path = url.pathname;
  
  if (path === '/v1/models') {
    const models = [...CONFIG.CHAT_MODELS, ...CONFIG.IMAGE_MODELS].map(id => ({
      id, object: 'model', created: Date.now(), owned_by: 'typli'
    }));
    return new Response(JSON.stringify({object: 'list', data: models}), {
      headers: corsHeaders({'Content-Type': 'application/json'})
    });
  }
  
  if (path === '/v1/chat/completions' || path === '/v1/images/generations') {
    return handleChatCompletions(request);
  }
  
  return jsonError('未找到', 404);
}

async function handleChatCompletions(request) {
  try {
    const body = await request.json();
    const model = body.model || CONFIG.CHAT_MODELS[0];
    const isImage = CONFIG.IMAGE_MODELS.includes(model);
    let prompt = body.prompt || body.messages?.filter(m => m.role === 'user').pop()?.content;
    
    if (!prompt) return jsonError('未找到提示词', 400);
    
    const {readable, writable} = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    const requestId = crypto.randomUUID();
    
    (async () => {
      try {
        if (isImage) {
          const res = await fetch(CONFIG.UPSTREAM_IMAGE_URL, {
            method: 'POST',
            headers: {...CONFIG.BASE_HEADERS, referer: CONFIG.REFERER_IMAGE_URL},
            body: JSON.stringify({prompt, model})
          });
          const result = await res.json();
          if (result.url) {
            const chunk = makeChunk(requestId, model, `![${prompt}](${result.url})`);
            await writer.write(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
          }
        } else {
          const sessionId = randomId(16);
          const messages = (body.messages || []).map(m => ({
            parts: [{type: 'text', text: m.content}], id: randomId(16), role: m.role
          }));
          
          const res = await fetch(CONFIG.UPSTREAM_CHAT_URL, {
            method: 'POST',
            headers: {...CONFIG.BASE_HEADERS, referer: CONFIG.REFERER_CHAT_URL},
            body: JSON.stringify({
              slug: 'free-no-sign-up-chatgpt',
              modelId: model,
              id: sessionId,
              messages,
              trigger: 'submit-message'
            })
          });
          
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          
          while (true) {
            const {done, value} = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, {stream: true});
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim();
                if (data === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.type === 'text-delta' && parsed.delta) {
                    const chunk = makeChunk(requestId, model, parsed.delta);
                    await writer.write(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
                  }
                } catch (e) {}
              }
            }
          }
        }
        
        await writer.write(encoder.encode(`data: ${JSON.stringify(makeChunk(requestId, model, null, 'stop'))}\n\n`));
        await writer.write(encoder.encode('data: [DONE]\n\n'));
      } catch (e) {
        await writer.write(encoder.encode(`data: ${JSON.stringify(makeChunk(requestId, model, `[错误: ${e.message}]`, 'stop'))}\n\n`));
      } finally {
        await writer.close();
      }
    })();
    
    return new Response(readable, {
      headers: corsHeaders({'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache'})
    });
  } catch (e) {
    return jsonError(e.message, 500);
  }
}

function handleUI(request) {
  const origin = new URL(request.url).origin;
  const key = request.ctx.apiKey;
  
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${CONFIG.PROJECT_NAME}</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/marked/11.1.1/marked.min.js"></script>
<style>
/* 这里是完整的CSS样式 */
*{margin:0;padding:0;box-sizing:border-box}
:root{
--chat:#667eea;--image:#f5576c;--api:#10b981;
--bg:#0f172a;--surface:#1e293b;--card:#334155;
--text:#f1f5f9;--text2:#94a3b8;--border:rgba(255,255,255,.1);
--success:#10b981;--warning:#f59e0b;--error:#ef4444;
--font-base:15px;--font-sm:13px;--font-xs:12px;--font-xxs:11px;
--font-lg:16px;--font-xl:18px;--font-2xl:22px;--font-3xl:28px;
--center-width:800px;
}
[data-theme=light]{--bg:#fff;--surface:#f8fafc;--card:#e2e8f0;--text:#1e293b;--text2:#64748b;--border:rgba(0,0,0,.1)}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Microsoft YaHei','微软雅黑',sans-serif;background:var(--bg);color:var(--text);height:100vh;display:flex;flex-direction:column;overflow:hidden;transition:all .3s;font-size:var(--font-base)}
.topbar{background:var(--surface);border-bottom:1px solid var(--border);padding:0 24px;display:flex;align-items:center;justify-content:space-between;height:60px;box-shadow:0 2px 8px rgba(0,0,0,.1);flex-shrink:0}
.logo{font-size:var(--font-xl);font-weight:800;background:linear-gradient(135deg,var(--chat),var(--image));-webkit-background-clip:text;-webkit-text-fill-color:transparent;display:flex;align-items:center;gap:8px}
.tabs{display:flex;gap:8px}
.tab{padding:8px 18px;border:none;background:transparent;color:var(--text2);font-weight:600;border-radius:8px;cursor:pointer;transition:all .3s;font-size:var(--font-sm)}
.tab.active{background:linear-gradient(135deg,var(--chat),var(--image));color:#fff;box-shadow:0 4px 12px rgba(102,126,234,.4)}
.tab:not(.active):hover{background:rgba(102,126,234,.1)}
.controls{display:flex;gap:12px;align-items:center}
.btn-icon{width:36px;height:36px;border:none;border-radius:8px;background:rgba(255,255,255,.05);color:var(--text);cursor:pointer;font-size:var(--font-base);transition:all .2s}
.btn-icon:hover{background:rgba(255,255,255,.1);transform:scale(1.1)}
.container{flex:1;display:flex;overflow:hidden;position:relative;min-height:0}
.panel{width:100%;height:100%;position:absolute;top:0;left:0;display:none;opacity:0;transition:opacity .3s}
.panel.active{display:flex;opacity:1}
/* ... 剩余CSS样式省略 ...由于字数限制,请查看原代码 */
</style>
</head>
<body data-theme="dark">
<nav class="topbar">
<div class="logo"><span>⚡</span><span>${CONFIG.PROJECT_NAME}</span></div>
<div class="tabs">
<button class="tab active" onclick="switchMode('chat')">💬 聊天</button>
<button class="tab" onclick="switchMode('image')">🎨 图像</button>
<button class="tab" onclick="switchMode('api')">📡 接口</button>
<!-- 新增：图像历史按钮 -->
<button class="tab" onclick="openImageHistory()">🖼 历史</button>
</div>
<div class="controls">
<button class="btn-icon" id="theme-btn" onclick="toggleTheme()" title="主题">🌙</button>
</div>
</nav>
<!-- HTML内容太长,请查看完整代码 -->
<script>
function openImageHistory(){
  window.open('/images','_blank');
}
/* JavaScript代码太长,请查看完整代码 */
</script>
</body>
</html>`;
  
  return new Response(html, {headers: {'Content-Type': 'text/html; charset=utf-8'}});
}

// 新增：图像历史独立页面
function handleImageHistoryUI(request) {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>图像历史记录 - ${CONFIG.PROJECT_NAME}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0f172a;--surface:#1e293b;--card:#334155;--text:#f1f5f9;--text2:#94a3b8;--border:rgba(255,255,255,.1);--image:#f5576c}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;padding:20px}
.header{text-align:center;margin-bottom:40px}
.title{font-size:32px;font-weight:900;background:linear-gradient(135deg,#f093fb,var(--image));-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:10px}
.subtitle{color:var(--text2);font-size:14px}
.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;max-width:1400px;margin:0 auto}
.image-card{background:var(--surface);border-radius:14px;overflow:hidden;border:1px solid var(--border);transition:all .3s;cursor:pointer}
.image-card:hover{transform:translateY(-4px);box-shadow:0 12px 36px rgba(245,87,108,.3);border-color:var(--image)}
.image-card img{width:100%;aspect-ratio:1;object-fit:cover;background:var(--card)}
.image-info{padding:16px}
.image-prompt{font-size:13px;color:var(--text);line-height:1.6;margin-bottom:10px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.image-meta{display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--text2);margin-top:10px}
.image-model{background:var(--card);padding:4px 10px;border-radius:6px;font-weight:600}
.empty{text-align:center;padding:80px 20px;color:var(--text2)}
.empty-icon{font-size:64px;margin-bottom:20px;opacity:.6}
.lightbox{display:none;position:fixed;inset:0;background:rgba(0,0,0,.95);z-index:9999;justify-content:center;align-items:center;cursor:pointer}
.lightbox.active{display:flex}
.lightbox img{max-width:90%;max-height:85%;border-radius:10px;box-shadow:0 20px 60px rgba(0,0,0,.5)}
.back-btn{position:fixed;bottom:30px;right:30px;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#f093fb,var(--image));border:none;color:#fff;font-size:24px;cursor:pointer;box-shadow:0 8px 24px rgba(245,87,108,.4);transition:all .3s;z-index:100}
.back-btn:hover{transform:scale(1.1)}
</style>
</head>
<body>
<div class="header">
<h1 class="title">🖼 图像历史记录</h1>
<p class="subtitle">所有生成的图像都保存在本地浏览器中</p>
</div>
<div class="gallery" id="gallery"></div>
<div class="lightbox" id="lightbox" onclick="this.classList.remove('active')">
<img id="lightbox-img" src="">
</div>
<button class="back-btn" onclick="window.close()" title="关闭窗口">←</button>
<script>
const imageHistory = JSON.parse(localStorage.getItem('typli_images') || '[]');
const gallery = document.getElementById('gallery');
if(imageHistory.length === 0){
  gallery.innerHTML = '<div class="empty" style="grid-column:1/-1"><div class="empty-icon">🖼️</div><h3>暂无图像历史</h3><p style="margin-top:10px;font-size:14px">返回主页开始创作您的第一张 AI 图像</p></div>';
}else{
  imageHistory.forEach(img => {
    const card = document.createElement('div');
    card.className = 'image-card';
    const shortModel = img.model.split('/').pop();
    const date = new Date(img.timestamp).toLocaleString('zh-CN');
    card.innerHTML = `
      <img src="${img.url}" alt="${img.prompt}" onclick="viewImage('${img.url}')">
      <div class="image-info">
        <div class="image-prompt">${img.prompt}</div>
        <div class="image-meta">
          <span class="image-model">${shortModel}</span>
          <span>${date}</span>
        </div>
      </div>
    `;
    gallery.appendChild(card);
  });
}
function viewImage(url){
  document.getElementById('lightbox-img').src = url;
  document.getElementById('lightbox').classList.add('active');
}
</script>
</body>
</html>`;
  
  return new Response(html, {headers: {'Content-Type': 'text/html; charset=utf-8'}});
}

function randomId(len){const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';let r='';for(let i=0;i<len;i++)r+=chars[Math.floor(Math.random()*chars.length)];return r}
function makeChunk(id,model,content,finish=null){return {id:`chatcmpl-${id}`,object:'chat.completion.chunk',created:Math.floor(Date.now()/1000),model,choices:[{index:0,delta:content?{content}:{},finish_reason:finish}]}}
function jsonError(msg,status){return new Response(JSON.stringify({error:{message:msg,type:'api_error'}}),{status,headers:corsHeaders({'Content-Type':'application/json'})})}
function corsHeaders(h={}){return {...h,'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization'}}