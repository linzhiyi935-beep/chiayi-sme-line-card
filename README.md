# 嘉義中小型企業轉型 LINE 數位名片

手機友善的 LINE 數位名片生成器，可編輯個人資料、照片、色彩、作品案例與菜單，並支援 LIFF 分享與官方帳號推送 Flex 名片。

## 官方帳號自動發送

GitHub Pages 只能提供靜態網頁，不能保存 LINE 密鑰，也不能接收 Webhook。若要「加入官方帳號後由官方帳號發送名片」，請部署 `server.cjs` 到可執行 Node.js 的 HTTPS 主機，例如 Render、Railway、Fly.io、Vercel Serverless 改寫版本或自己的 VPS。

部署環境變數：

- `LINE_LOGIN_CHANNEL_ID`：LINE Login Channel ID，目前 LIFF 使用 `2010280088`
- `LINE_CHANNEL_ACCESS_TOKEN`：Messaging API Channel access token
- `LINE_CHANNEL_SECRET`：Messaging API Channel secret
- `PORT`：主機平台指定時才需要

LINE Developers 後台設定：

- Messaging API channel 要和 LIFF 所在的 LINE Login channel 在同一個 Provider。
- LIFF app 的 Add friend option 要連到同一個 LINE Official Account。
- Messaging API Webhook URL 設為 `https://你的後端網域/webhook`。
- 開啟 Use webhook。

本機測試：

```bash
PORT=4174 node server.cjs
```

健康檢查：

```text
GET /health
```
