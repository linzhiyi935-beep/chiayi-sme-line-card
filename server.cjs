const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require("os");

const root = __dirname;
const port = Number(process.env.PORT || 4173);
const loginChannelId = process.env.LINE_LOGIN_CHANNEL_ID || "2010280088";
const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
const channelSecret = process.env.LINE_CHANNEL_SECRET || "";
const uploadDir = path.join(os.tmpdir(), "line-card-images");

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

const imageTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, X-Line-Signature",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function verifyLineSignature(body, signature) {
  if (!channelSecret || !signature) return false;
  const expected = crypto.createHmac("sha256", channelSecret).update(body).digest("base64");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

function clampText(value, limit, fallback = "") {
  const text = String(value || fallback || "").trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1)}…`;
}

function asFlexColor(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(String(value || "")) ? value : fallback;
}

function makeLink(url) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^(https?:|mailto:|tel:)/i.test(value)) return value;
  return `https://${value}`;
}

function optionalButton(label, uri, options = {}) {
  const href = makeLink(uri);
  if (!href) return null;
  if (href.length > 1000) return null;
  return {
    type: "button",
    style: options.style || "link",
    height: "sm",
    action: {
      type: "uri",
      label: clampText(label, 20, "開啟連結"),
      uri: href,
    },
  };
}

function makeLineProfileUrl(lineId) {
  const value = String(lineId || "").trim();
  if (!value) return "";
  return `https://line.me/R/ti/p/${encodeURIComponent(value)}`;
}

function isPublicImageUrl(value) {
  return /^https:\/\/.+/i.test(String(value || "").trim());
}

function imageBox(url, options = {}) {
  if (!isPublicImageUrl(url)) return null;
  return {
    type: "image",
    url,
    size: options.size || "full",
    aspectRatio: options.aspectRatio || "16:9",
    aspectMode: "cover",
    gravity: "center",
    margin: options.margin || "none",
  };
}

function buildFlexBusinessCard(card, publicUrl) {
  const colors = card.colors || {};
  const bg = asFlexColor(colors.cardBg, "#ffffff");
  const text = asFlexColor(colors.text, "#183128");
  const muted = asFlexColor(colors.muted, "#64726d");
  const accent = asFlexColor(colors.accent, "#19a866");
  const button = asFlexColor(colors.button, "#06c755");
  const chipBg = asFlexColor(colors.chipBg, "#e6f9ee");
  const caseBg = asFlexColor(colors.caseBg, "#f6faf8");
  const border = asFlexColor(colors.border, "#06c755");

  const heroTexts = [
    { type: "text", text: clampText(card.company, 44, "LINE 數位名片"), size: "xs", weight: "bold", color: accent, wrap: true },
    { type: "text", text: clampText(card.displayName, 38, "我的 LINE 數位名片"), size: "xl", weight: "bold", color: text, wrap: true, margin: "sm" },
  ];

  const names = [card.chineseName, card.englishName].filter(Boolean).join(" / ");
  if (names) heroTexts.push({ type: "text", text: clampText(names, 48), size: "sm", color: muted, wrap: true, margin: "sm" });
  if (card.bio) heroTexts.push({ type: "text", text: clampText(card.bio, 180), size: "sm", color: text, wrap: true, margin: "md" });

  const avatarImage = imageBox(card.avatar, {
    size: "md",
    aspectRatio: "1:1",
  });

  const contents = [
    card.cover
      ? imageBox(card.cover, {
          aspectRatio: "20:9",
        })
      : null,
    {
      type: "box",
      layout: avatarImage ? "horizontal" : "vertical",
      backgroundColor: chipBg,
      cornerRadius: "md",
      paddingAll: "12px",
      margin: card.cover ? "md" : "none",
      contents: avatarImage
        ? [
            avatarImage,
            {
              type: "box",
              layout: "vertical",
              margin: "md",
              contents: heroTexts,
            },
          ]
        : heroTexts,
    },
  ].filter(Boolean);

  if (card.products) {
    contents.push({
      type: "box",
      layout: "vertical",
      margin: "md",
      backgroundColor: caseBg,
      cornerRadius: "md",
      paddingAll: "12px",
      contents: [
        { type: "text", text: "產品 / 服務", size: "xs", weight: "bold", color: accent },
        { type: "text", text: clampText(card.products, 220), size: "sm", color: muted, wrap: true, margin: "xs" },
      ],
    });
  }

  const contactLines = [
    card.phone ? `電話：${card.phone}` : "",
    card.lineId ? `LINE：${card.lineId}` : "",
    card.email ? `Email：${card.email}` : "",
    card.address ? `地址：${card.address}` : "",
  ].filter(Boolean);

  if (contactLines.length) {
    contents.push({
      type: "box",
      layout: "vertical",
      margin: "md",
      spacing: "xs",
      contents: contactLines.slice(0, 4).map((line) => ({
        type: "text",
        text: clampText(line, 90),
        size: "xs",
        color: muted,
        wrap: true,
      })),
    });
  }

  const websiteLines = [
    card.website ? `網站：${makeLink(card.website)}` : "",
    card.social ? `社群：${makeLink(card.social)}` : "",
  ].filter(Boolean);

  if (websiteLines.length) {
    contents.push({
      type: "box",
      layout: "vertical",
      margin: "md",
      spacing: "xs",
      contents: websiteLines.map((line) => ({
        type: "text",
        text: clampText(line, 90),
        size: "xs",
        color: muted,
        wrap: true,
      })),
    });
  }

  const caseSummaries = (Array.isArray(card.cases) ? card.cases : [])
    .filter((item) => String(item.title || item.category || item.description || "").trim())
    .slice(0, 3);

  if (caseSummaries.length) {
    contents.push({
      type: "box",
      layout: "vertical",
      margin: "md",
      backgroundColor: caseBg,
      cornerRadius: "md",
      paddingAll: "12px",
      spacing: "sm",
      contents: [
        { type: "text", text: clampText(card.caseTitle, 40, "作品案例 / 菜單"), size: "xs", weight: "bold", color: accent },
        ...caseSummaries.map((item, index) => ({
          type: "box",
          layout: "vertical",
          margin: index === 0 ? "xs" : "sm",
          contents: [
            { type: "text", text: clampText(item.title, 42, `作品 ${index + 1}`), size: "sm", weight: "bold", color: text, wrap: true },
            item.category ? { type: "text", text: clampText(item.category, 36), size: "xs", color: accent, wrap: true, margin: "xs" } : null,
            item.description ? { type: "text", text: clampText(item.description, 90), size: "xs", color: muted, wrap: true, margin: "xs" } : null,
          ].filter(Boolean),
        })),
      ],
    });
  }

  const caseButtons = (Array.isArray(card.cases) ? card.cases : [])
    .filter((item) => String(item.title || item.link || "").trim() && String(item.link || "").trim())
    .slice(0, 3)
    .map((item, index) => optionalButton(item.title || `作品 ${index + 1}`, item.link))
    .filter(Boolean);

  const footerButtons = [
    optionalButton("開啟互動名片", publicUrl, { style: "primary" }),
    optionalButton("撥打電話", card.phone ? `tel:${String(card.phone).replace(/[^\d+]/g, "")}` : ""),
    optionalButton("加 LINE", makeLineProfileUrl(card.lineId)),
    optionalButton("官方網站", card.website),
    optionalButton("社群連結", card.social),
    ...caseButtons,
  ].filter(Boolean);

  const primaryFooterButton = footerButtons.find((item) => item.style === "primary");
  if (primaryFooterButton) primaryFooterButton.color = button;

  return {
    type: "flex",
    altText: clampText(`${card.displayName || "我的"} LINE 數位名片`, 400),
    contents: {
      type: "bubble",
      size: "mega",
      body: {
        type: "box",
        layout: "vertical",
        backgroundColor: bg,
        paddingAll: "18px",
        contents,
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        backgroundColor: bg,
        contents: footerButtons.length
          ? footerButtons
          : [{ type: "text", text: "請在名片中加入至少一個可點擊連結", size: "sm", color: muted, wrap: true }],
      },
      styles: { footer: { separator: true, separatorColor: border } },
    },
  };
}

async function verifyIdToken(idToken) {
  const params = new URLSearchParams({ id_token: idToken, client_id: loginChannelId });
  const response = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  if (!response.ok) throw new Error("LINE 授權驗證失敗");
  return response.json();
}

async function pushMessage(userId, message) {
  if (!channelAccessToken) throw new Error("後端尚未設定 LINE_CHANNEL_ACCESS_TOKEN");
  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify({ to: userId, messages: [message] }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`官方帳號發送失敗：${detail || response.status}`);
  }
}

function getRequestBaseUrl(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host || "";
  const proto = req.headers["x-forwarded-proto"] || (/^(localhost|127\.0\.0\.1)/i.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}

async function handleUploadImages(req, res) {
  try {
    const body = JSON.parse((await readBody(req)).toString("utf8") || "{}");
    const images = Array.isArray(body.images) ? body.images.slice(0, 8) : [];
    const uploads = {};

    await fs.promises.mkdir(uploadDir, { recursive: true });

    for (const item of images) {
      const key = String(item.key || "").replace(/[^a-z0-9_.-]/gi, "").slice(0, 80);
      const dataUrl = String(item.dataUrl || "");
      const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([a-z0-9+/=]+)$/i);
      if (!key || !match) continue;

      const mime = match[1].toLowerCase();
      const ext = imageTypes[mime];
      const buffer = Buffer.from(match[2], "base64");
      if (!ext || buffer.length === 0 || buffer.length > 4 * 1024 * 1024) continue;

      const hash = crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 18);
      const filename = `${Date.now()}-${hash}.${ext}`;
      await fs.promises.writeFile(path.join(uploadDir, filename), buffer);
      uploads[key] = `${getRequestBaseUrl(req)}/uploads/${filename}`;
    }

    sendJson(res, 200, { uploads });
  } catch (error) {
    sendJson(res, 500, { error: "upload_failed", message: error.message || "image upload failed" });
  }
}

async function replyMessage(replyToken, messages) {
  if (!channelAccessToken || !replyToken) return;
  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  });
}

async function handleSendCard(req, res) {
  try {
    const body = JSON.parse((await readBody(req)).toString("utf8") || "{}");
    if (!body.idToken || !body.card) {
      sendJson(res, 400, { error: "missing_payload", message: "缺少 LINE 授權或名片資料" });
      return;
    }
    const profile = await verifyIdToken(body.idToken);
    const message = buildFlexBusinessCard(body.card, body.publicUrl);
    await pushMessage(profile.sub, message);
    sendJson(res, 200, { ok: true });
  } catch (error) {
    sendJson(res, 500, { error: "send_failed", message: error.message || "官方帳號發送失敗" });
  }
}

async function handleWebhook(req, res) {
  const body = await readBody(req);
  if (!verifyLineSignature(body, req.headers["x-line-signature"])) {
    sendJson(res, 401, { error: "invalid_signature" });
    return;
  }

  const payload = JSON.parse(body.toString("utf8") || "{}");
  for (const event of payload.events || []) {
    if (event.type === "follow") {
      await replyMessage(event.replyToken, [
        {
          type: "text",
          text: "歡迎加入！請回到 LINE 數位名片頁，按「官方帳號發送」，我就會把你剛設計好的名片發到這裡。",
        },
      ]);
    }
  }
  sendJson(res, 200, { ok: true });
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  if (urlPath.startsWith("/uploads/")) {
    const filename = path.basename(urlPath);
    const filePath = path.join(uploadDir, filename);
    if (!filePath.startsWith(uploadDir)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      res.writeHead(200, {
        "Content-Type": types[path.extname(filePath).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "public, max-age=604800",
      });
      res.end(data);
    });
    return;
  }

  const normalized = path.normalize(urlPath).replace(/^(\.\.[\\/])+/, "");
  const filePath = path.join(root, normalized === "/" ? "index.html" : normalized);

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": types[path.extname(filePath).toLowerCase()] || "application/octet-stream",
    });
    res.end(data);
  });
}

http
  .createServer(async (req, res) => {
    if (req.method === "OPTIONS") {
      sendJson(res, 204, {});
      return;
    }

    const pathname = new URL(req.url, "http://localhost").pathname;
    const cleanPath = pathname.replace(/\/+$/, "") || "/";

    if (req.method === "GET" && cleanPath === "/health") {
      sendJson(res, 200, { ok: true });
      return;
    }
    if (req.method === "POST" && cleanPath === "/api/send-card") {
      await handleSendCard(req, res);
      return;
    }
    if (req.method === "POST" && cleanPath === "/api/upload-images") {
      await handleUploadImages(req, res);
      return;
    }
    if (req.method === "POST" && cleanPath === "/webhook") {
      await handleWebhook(req, res);
      return;
    }

    serveStatic(req, res);
  })
  .listen(port, "0.0.0.0", () => {
    console.log(`LINE card generator running at http://127.0.0.1:${port}`);
  });
