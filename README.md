# WordWhiz · 小小听写官

一个适合手机使用的浏览器端英文听写工具：拍照/上传单词表，自动识别英文单词，再按自定义速度和间隔朗读。

## 运行

桌面端可以直接双击 `index.html` 使用手动输入和听写功能。要在手机上拍照并稳定运行 PaddleOCR，推荐把这个目录放到支持 HTTPS 的静态网站托管服务，或在电脑上运行：

```bash
python3 -m http.server 8080 --directory /Users/didi/word-dictation-tool
```

然后在手机浏览器打开同一局域网地址。OCR、自然语音的 JavaScript、WASM 和模型全部由本站提供，不依赖第三方 CDN。首次仍需联网下载本站资源。

## 发布成 HTTPS 链接（推荐）

这个目录已经包含 GitHub Pages 工作流：`.github/workflows/pages.yml`。

1. 在 GitHub 新建一个公开仓库，例如 `wordwhiz`。
2. 把本目录中的全部文件上传到仓库根目录，并确保默认分支叫 `main`。
3. 打开仓库的 **Settings → Pages**，将 **Source** 设为 **GitHub Actions**。
4. 等待 Actions 完成，GitHub 会生成一个 `https://你的用户名.github.io/仓库名/` 地址。
5. 把这个地址发给别人，手机直接打开即可；也可以用该地址生成二维码。

仓库根目录必须保留 `index.html`、`manifest.webmanifest` 和 `.github/workflows/pages.yml`。工作流每次推送到 `main` 都会自动更新网页。

## 已包含

- 独立的“拍照”和“从相册选择”入口；只有拍照入口使用 `capture="environment"`，相册入口保留系统图片选择器
- 浏览器本地 OCR（仅使用 PaddleOCR PP-OCRv5，不切换其他 OCR）
- 图片清晰化预处理、英文候选词去重和可编辑确认
- OCR 结果可编辑、去重、手动补充
- 朗读速度 0.55×–1.25×、单词间隔 1–8 秒
- 每词 1/2/3 遍、随机顺序
- Kokoro 82M 本地神经语音（自然女声/男声），首次下载模型后缓存在浏览器
- 浏览器语音兼容模式，适合低性能设备或模型加载失败时使用
- 暂停/继续、重播、显示答案、下一个
- “清空本次”会立即停止语音并重置当前听写，不需要退出网页
- 历史记录保存在本机，可恢复单词、图片缩略图和听写设置，最多保留 20 条
- Kokoro 语音在浏览器本机生成，兼容模式使用 Web Speech API；图片和单词不会发送到应用自己的服务器

## 注意

识别运行库位于 `vendor/`，PP-OCRv5 模型位于 `paddle-model/`；自然语音运行库、发音组件及 WASM 也随站点发布。Kokoro 模型（约 92MB）和音色位于 `kokoro-model/`。页面限制网络请求到本站，不会调用 jsDelivr、百度对象存储或 Hugging Face。首次加载取决于本站网络速度和设备性能，并不等同于首次离线可用。若 PaddleOCR 加载失败，页面会明确提示错误并提供重试，不会切换其他 OCR。历史记录保存的是单词和设置，恢复后重新生成音频。

## 更新本地运行库

`vendor/` 是已提交的构建产物，Pages 不需要现场下载依赖。维护时运行：

```bash
npm ci --ignore-scripts
npm run build:vendor
```

锁文件固定所有依赖版本；OCR 与 TTS 使用独立且版本匹配的 ONNX Runtime/WASM。构建脚本将 Kokoro 音色 URL 改成本地路径，并保留第三方许可证。页面的 CSP 禁止第三方资源，允许 OpenCV 编译所需的动态代码执行。

在启动了 `--remote-debugging-port=9224` 的 Chrome 和本地静态服务器后，可运行 `node scripts/check-same-origin.mjs http://127.0.0.1:8765/`。测试创建隔离浏览器上下文，拦截第三方 HTTP 请求，用图片走完整 PaddleOCR 流程并播放 Kokoro 音频，验证第三方请求数为零；也可传入正式站点 URL。桌面手机视口测试不等于 iPhone/安卓真机验证。

Kokoro 模型采用 Apache-2.0 许可，模型文件位于 `kokoro-model/`，来源为 [onnx-community/Kokoro-82M-v1.0-ONNX](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX)。
