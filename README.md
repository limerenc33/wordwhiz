# WordWhiz · 小小听写官

一个适合手机使用的浏览器端英文听写工具：拍照/上传单词表，自动识别英文单词，再按自定义速度和间隔朗读。

## 运行

桌面端可以直接双击 `index.html` 使用手动输入和听写功能。要在手机上拍照并稳定运行 OCR，推荐把这个目录放到任意支持 HTTPS 的静态网站托管服务，或在电脑上运行：

```bash
python3 -m http.server 8080 --directory /Users/didi/word-dictation-tool
```

然后在手机浏览器打开同一局域网地址。首次 OCR 需要联网加载识别引擎和英文语言包。

## 发布成 HTTPS 链接（推荐）

这个目录已经包含 GitHub Pages 工作流：`.github/workflows/pages.yml`。

1. 在 GitHub 新建一个公开仓库，例如 `wordwhiz`。
2. 把本目录中的全部文件上传到仓库根目录，并确保默认分支叫 `main`。
3. 打开仓库的 **Settings → Pages**，将 **Source** 设为 **GitHub Actions**。
4. 等待 Actions 完成，GitHub 会生成一个 `https://你的用户名.github.io/仓库名/` 地址。
5. 把这个地址发给别人，手机直接打开即可；也可以用该地址生成二维码。

仓库根目录必须保留 `index.html`、`manifest.webmanifest` 和 `.github/workflows/pages.yml`。工作流每次推送到 `main` 都会自动更新网页。

## 已包含

- 手机相机拍照与图片上传（`capture="environment"`）
- 浏览器本地 OCR（Tesseract.js，英文）
- OCR 结果可编辑、去重、手动补充
- 朗读速度 0.55×–1.25×、单词间隔 1–8 秒
- 每词 1/2/3 遍、随机顺序
- 暂停/继续、重播、显示答案、下一个
- 语音由浏览器 Web Speech API 提供，图片不会发送到应用自己的服务器

## 注意

若网络不可用，仍可以手动输入单词并使用听写功能。不同手机浏览器提供的英文语音音色会略有差异。
