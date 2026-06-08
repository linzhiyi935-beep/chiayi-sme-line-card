const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require("os");
const sharp = require("sharp");
const { Resvg } = require("@resvg/resvg-js");

const root = __dirname;
const port = Number(process.env.PORT || 4173);
const loginChannelId = process.env.LINE_LOGIN_CHANNEL_ID || "2010280088";
const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
const channelSecret = process.env.LINE_CHANNEL_SECRET || "";
const uploadDir = path.join(os.tmpdir(), "line-card-images");
const cardDir = path.join(os.tmpdir(), "line-card-states");
let notoSansTcFontFiles = null;

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

function addUrlParam(url, key, value) {
  if (!url) return "";
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
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

function getUploadedFilenameFromUrl(req, value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw, getRequestBaseUrl(req));
    if (!parsed.pathname.startsWith("/uploads/")) return "";
    return path.basename(decodeURIComponent(parsed.pathname));
  } catch {
    return "";
  }
}

function getStoredCardImageFromUrl(req, value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw, getRequestBaseUrl(req));
    const match = parsed.pathname.match(/^\/api\/cards\/([a-f0-9]+)\/image\/((?:avatar|cover|case\d+)(?:\.(?:jpg|jpeg|png|webp|gif))?)$/i);
    if (!match) return null;
    const sourceId = match[1];
    const requested = match[2].toLowerCase();
    const key = requested.replace(/\.(jpg|jpeg|png|webp|gif)$/i, "");
    const requestedExt = (requested.match(/\.(jpg|jpeg|png|webp|gif)$/i)?.[1] || "").toLowerCase();
    return { sourceId, key, requestedExt };
  } catch {
    return null;
  }
}

async function copyUploadedImageForCard(req, id, key, value) {
  const filename = getUploadedFilenameFromUrl(req, value);
  let sourcePath = "";
  let ext = "";

  if (filename) {
    sourcePath = path.join(uploadDir, filename);
    if (!sourcePath.startsWith(uploadDir)) return value;
    ext = path.extname(filename).toLowerCase();
  } else {
    const storedImage = getStoredCardImageFromUrl(req, value);
    if (!storedImage || storedImage.key !== key) return value;
    const extensions = storedImage.requestedExt ? [storedImage.requestedExt] : [...new Set(Object.values(imageTypes))];
    for (const candidateExt of extensions) {
      const candidatePath = path.join(cardDir, `${storedImage.sourceId}-${key}.${candidateExt}`);
      if (!candidatePath.startsWith(cardDir)) continue;
      try {
        await fs.promises.access(candidatePath, fs.constants.R_OK);
        sourcePath = candidatePath;
        ext = `.${candidateExt}`;
        break;
      } catch {
        // Try the next supported image extension.
      }
    }
    if (!sourcePath) return value;
  }

  if (!types[ext] || !types[ext].startsWith("image/")) return value;

  const targetPath = path.join(cardDir, `${id}-${key}${ext}`);
  if (!targetPath.startsWith(cardDir)) return value;

  try {
    await fs.promises.copyFile(sourcePath, targetPath);
    return `${getRequestBaseUrl(req)}/api/cards/${id}/image/${key}${ext}`;
  } catch {
    return value;
  }
}

function imageBox(url, options = {}) {
  if (!isPublicImageUrl(url)) return null;
  return {
    type: "image",
    url,
    size: options.size || "full",
    aspectRatio: options.aspectRatio || "16:9",
    aspectMode: "cover",
    align: options.align || "center",
    gravity: "center",
    margin: options.margin || "none",
  };
}

function getNotoSansTcFontFiles() {
  if (notoSansTcFontFiles) return notoSansTcFontFiles;

  const fontPath = path.join(root, "assets", "fonts", "NotoSansTC-wght.ttf");
  notoSansTcFontFiles = fs.existsSync(fontPath) ? [fontPath] : [];
  if (!notoSansTcFontFiles.length) console.warn("Noto Sans TC font file is missing");

  return notoSansTcFontFiles;
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapSvgText(text, maxChars, maxLines = 4) {
  const chars = String(text || "").trim().split("");
  const lines = [];
  let line = "";
  for (const char of chars) {
    if ((line + char).length > maxChars && line) {
      lines.push(line);
      line = char;
      if (lines.length >= maxLines) break;
    } else {
      line += char;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

function svgText(text, x, y, options = {}) {
  const lines = wrapSvgText(text, options.maxChars || 28, options.maxLines || 3);
  const lineHeight = options.lineHeight || 38;
  const weight = options.weight || 400;
  return lines
    .map((line, index) => `<text x="${x}" y="${y + index * lineHeight}" fill="${options.color || "#183128"}" font-size="${options.size || 28}" font-weight="${weight}" font-family="'Noto Sans TC','Microsoft JhengHei',Arial,sans-serif" style="font-variation-settings:'wght' ${weight}">${escapeXml(line)}</text>`)
    .join("");
}

async function imageDataUriFromLocalUrl(req, value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw, getRequestBaseUrl(req));
    let filePath = "";
    if (parsed.pathname.startsWith("/uploads/")) {
      filePath = path.join(uploadDir, path.basename(decodeURIComponent(parsed.pathname)));
      if (!filePath.startsWith(uploadDir)) return "";
    } else {
      const match = parsed.pathname.match(/^\/api\/cards\/([a-f0-9]+)\/image\/((?:avatar|cover|case\d+)(?:\.(?:jpg|jpeg|png|webp|gif))?)$/i);
      if (!match) return "";
      const requested = match[2].toLowerCase();
      const key = requested.replace(/\.(jpg|jpeg|png|webp|gif)$/i, "").replace(/[^a-z0-9]/gi, "");
      const ext = (requested.match(/\.(jpg|jpeg|png|webp|gif)$/i)?.[1] || "").toLowerCase();
      if (!key || !ext) return "";
      filePath = path.join(cardDir, `${match[1]}-${key}.${ext}`);
      if (!filePath.startsWith(cardDir)) return "";
    }
    const data = await fs.promises.readFile(filePath);
    const type = types[path.extname(filePath).toLowerCase()] || "image/jpeg";
    return `data:${type};base64,${data.toString("base64")}`;
  } catch {
    return "";
  }
}

async function buildCardPosterSvg(req, card) {
  const colors = card.colors || {};
  const pageBg = asFlexColor(colors.pageBg, "#e9fff2");
  const cardBg = asFlexColor(colors.cardBg, "#ffffff");
  const text = asFlexColor(colors.text, "#183128");
  const muted = asFlexColor(colors.muted, "#64726d");
  const accent = asFlexColor(colors.accent, "#197aa0");
  const border = asFlexColor(colors.border, "#197aa0");
  const caseBg = asFlexColor(colors.caseBg, "#f0f7fa");
  const chipBg = asFlexColor(colors.chipBg, "#e6f4f8");
  const cover = await imageDataUriFromLocalUrl(req, card.cover);
  const avatar = await imageDataUriFromLocalUrl(req, card.avatar);
  const cases = (Array.isArray(card.cases) ? card.cases : []).slice(0, 2);
  const caseImages = await Promise.all(cases.map((item) => imageDataUriFromLocalUrl(req, item.image)));
  const names = [card.chineseName, card.englishName].filter(Boolean).join(" / ");
  const contactLines = [
    card.phone ? `電話：${card.phone}` : "",
    card.lineId ? `LINE：${card.lineId}` : "",
    card.email ? `Email：${card.email}` : "",
    card.address ? `地址：${card.address}` : "",
    card.website ? `網站：${card.website}` : "",
    card.social ? `社群：${card.social}` : "",
  ].filter(Boolean);

  let y = 470;
  const parts = [];
  parts.push(`<rect width="900" height="1700" fill="${pageBg}"/>`);
  parts.push(`<rect x="42" y="42" width="816" height="1580" rx="34" fill="${cardBg}" stroke="${border}" stroke-width="5"/>`);
  parts.push(`<clipPath id="coverClip"><rect x="72" y="72" width="756" height="260" rx="28"/></clipPath>`);
  if (cover) parts.push(`<image href="${cover}" x="72" y="72" width="756" height="260" preserveAspectRatio="xMidYMid slice" clip-path="url(#coverClip)"/>`);
  else parts.push(`<rect x="72" y="72" width="756" height="260" rx="28" fill="${chipBg}"/>`);
  parts.push(`<clipPath id="avatarClip"><circle cx="175" cy="350" r="78"/></clipPath>`);
  parts.push(`<circle cx="175" cy="350" r="86" fill="#fff"/>`);
  if (avatar) parts.push(`<image href="${avatar}" x="97" y="272" width="156" height="156" preserveAspectRatio="xMidYMid slice" clip-path="url(#avatarClip)"/>`);
  else parts.push(`<circle cx="175" cy="350" r="78" fill="${chipBg}"/>`);
  parts.push(svgText(card.company, 90, y, { color: accent, size: 28, weight: 800, maxChars: 28, maxLines: 1 }));
  y += 58;
  parts.push(svgText(card.displayName || "LINE 數位名片", 90, y, { color: text, size: 50, weight: 900, maxChars: 16, maxLines: 2, lineHeight: 62 }));
  y += 124;
  if (names) {
    parts.push(svgText(names, 90, y, { color: muted, size: 30, weight: 600, maxChars: 28, maxLines: 1 }));
    y += 54;
  }
  parts.push(svgText(card.bio, 90, y, { color: text, size: 30, weight: 400, maxChars: 23, maxLines: 4, lineHeight: 44 }));
  y += 210;
  parts.push(`<rect x="90" y="${y}" width="720" height="150" rx="18" fill="${caseBg}"/>`);
  parts.push(svgText("產品 / 服務", 120, y + 48, { color: text, size: 30, weight: 800, maxChars: 12, maxLines: 1 }));
  parts.push(svgText(card.products, 120, y + 92, { color: muted, size: 28, weight: 400, maxChars: 22, maxLines: 2, lineHeight: 38 }));
  y += 195;
  contactLines.slice(0, 6).forEach((line) => {
    parts.push(svgText(line, 90, y, { color: muted, size: 26, weight: 500, maxChars: 34, maxLines: 1 }));
    y += 40;
  });
  y += 28;
  if (cases.length) {
    parts.push(`<rect x="90" y="${y}" width="720" height="${130 + cases.length * 205}" rx="18" fill="${caseBg}"/>`);
    parts.push(svgText(card.caseTitle || "精選商品", 120, y + 48, { color: accent, size: 28, weight: 900, maxChars: 18, maxLines: 1 }));
    y += 86;
    cases.forEach((item, index) => {
      const image = caseImages[index];
      if (image) {
        parts.push(`<clipPath id="caseClip${index}"><rect x="120" y="${y}" width="210" height="120" rx="12"/></clipPath>`);
        parts.push(`<image href="${image}" x="120" y="${y}" width="210" height="120" preserveAspectRatio="xMidYMid slice" clip-path="url(#caseClip${index})"/>`);
      }
      const textX = image ? 350 : 120;
      parts.push(svgText(item.title || `商品 ${index + 1}`, textX, y + 32, { color: text, size: 28, weight: 900, maxChars: image ? 14 : 25, maxLines: 1 }));
      if (item.category) parts.push(svgText(item.category, textX, y + 70, { color: accent, size: 23, weight: 800, maxChars: 16, maxLines: 1 }));
      parts.push(svgText(item.description, textX, y + 106, { color: muted, size: 22, weight: 400, maxChars: image ? 18 : 28, maxLines: 2, lineHeight: 30 }));
      y += 200;
    });
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1700" viewBox="0 0 900 1700">${parts.join("")}</svg>`;
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
    size: "sm",
    aspectRatio: "1:1",
    align: "start",
    margin: "none",
  });

  const contents = [
    {
      type: "box",
      layout: "vertical",
      backgroundColor: chipBg,
      cornerRadius: "md",
      paddingAll: "12px",
      margin: "none",
      contents: avatarImage
        ? [
            avatarImage,
            ...heroTexts,
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
            item.image ? imageBox(item.image, { aspectRatio: "16:9", margin: "xs" }) : null,
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
    optionalButton("分享給好友", addUrlParam(publicUrl, "share", "1")),
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
      hero: card.cover
        ? imageBox(card.cover, {
            aspectRatio: "20:9",
          })
        : undefined,
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

async function pushMessage(userId, messages) {
  if (!channelAccessToken) throw new Error("後端尚未設定 LINE_CHANNEL_ACCESS_TOKEN");
  const payloadMessages = (Array.isArray(messages) ? messages : [messages]).filter(Boolean).slice(0, 5);
  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify({ to: userId, messages: payloadMessages }),
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

async function handleCreateCardImage(req, res) {
  try {
    const body = JSON.parse((await readBody(req)).toString("utf8") || "{}");
    if (!body.card) {
      sendJson(res, 400, { error: "missing_card", message: "missing card" });
      return;
    }

    await fs.promises.mkdir(uploadDir, { recursive: true });
    const svg = await buildCardPosterSvg(req, body.card);
    const rendered = new Resvg(svg, {
      fitTo: { mode: "width", value: 900 },
      font: {
        fontFiles: getNotoSansTcFontFiles(),
        loadSystemFonts: false,
        defaultFontFamily: "Noto Sans TC",
      },
    }).render();
    const image = await sharp(rendered.asPng()).jpeg({ quality: 86 }).toBuffer();
    const hash = crypto.createHash("sha256").update(image).digest("hex").slice(0, 18);
    const filename = `${Date.now()}-${hash}.jpg`;
    await fs.promises.writeFile(path.join(uploadDir, filename), image);

    const imageUrl = `${getRequestBaseUrl(req)}/uploads/${filename}`;
    sendJson(res, 200, {
      imageUrl,
      imageMessage: {
        type: "image",
        originalContentUrl: imageUrl,
        previewImageUrl: imageUrl,
      },
    });
  } catch (error) {
    sendJson(res, 500, {
      error: "card_image_failed",
      message: error.message || "card image failed",
    });
  }
}

async function handleSaveCard(req, res) {
  try {
    const body = JSON.parse((await readBody(req)).toString("utf8") || "{}");
    if (!body.card) {
      sendJson(res, 400, { error: "missing_card", message: "missing card" });
      return;
    }

    await fs.promises.mkdir(cardDir, { recursive: true });
    const id = crypto.randomBytes(8).toString("hex");
    const cases = await Promise.all(
      (Array.isArray(body.card.cases) ? body.card.cases : []).map(async (item, index) => ({
        ...item,
        image: await copyUploadedImageForCard(req, id, `case${index}`, item.image),
      })),
    );
    const card = {
      ...body.card,
      avatar: await copyUploadedImageForCard(req, id, "avatar", body.card.avatar),
      cover: await copyUploadedImageForCard(req, id, "cover", body.card.cover),
      cases,
    };
    const payload = {
      createdAt: new Date().toISOString(),
      card,
    };
    await fs.promises.writeFile(path.join(cardDir, `${id}.json`), JSON.stringify(payload), "utf8");
    sendJson(res, 200, { id, url: `${getRequestBaseUrl(req)}/?cardId=${id}`, card });
  } catch (error) {
    sendJson(res, 500, { error: "save_card_failed", message: error.message || "save card failed" });
  }
}

async function handleGetCard(req, res, id) {
  try {
    const safeId = String(id || "").replace(/[^a-f0-9]/gi, "");
    if (!safeId) {
      sendJson(res, 400, { error: "missing_card_id" });
      return;
    }

    const filePath = path.join(cardDir, `${safeId}.json`);
    if (!filePath.startsWith(cardDir)) {
      sendJson(res, 403, { error: "forbidden" });
      return;
    }

    const raw = await fs.promises.readFile(filePath, "utf8");
    const payload = JSON.parse(raw);
    sendJson(res, 200, { card: payload.card, createdAt: payload.createdAt });
  } catch {
    sendJson(res, 404, { error: "card_not_found", message: "card not found" });
  }
}

async function handleGetCardImage(req, res, id, key) {
  const safeId = String(id || "").replace(/[^a-f0-9]/gi, "");
  const requested = String(key || "").toLowerCase();
  const safeKey = requested.replace(/\.(jpg|jpeg|png|webp|gif)$/i, "").replace(/[^a-z0-9]/gi, "");
  const requestedExt = (requested.match(/\.(jpg|jpeg|png|webp|gif)$/i)?.[1] || "").toLowerCase();
  if (!safeId || !/^(avatar|cover|case\d+)$/.test(safeKey)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const extensions = requestedExt ? [requestedExt] : [...new Set(Object.values(imageTypes))];
  for (const ext of extensions) {
    const filePath = path.join(cardDir, `${safeId}-${safeKey}.${ext}`);
    if (!filePath.startsWith(cardDir)) continue;
    try {
      const data = await fs.promises.readFile(filePath);
      res.writeHead(200, {
        "Content-Type": types[path.extname(filePath).toLowerCase()] || "application/octet-stream",
        "Content-Length": data.length,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(req.method === "HEAD" ? undefined : data);
      return;
    } catch {
      // Try the next supported image extension.
    }
  }

  res.writeHead(404);
  res.end("Not found");
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
    await pushMessage(profile.sub, [body.imageMessage, message]);
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
        "Content-Length": data.length,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=604800",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(req.method === "HEAD" ? undefined : data);
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
    if (req.method === "POST" && cleanPath === "/api/card-image") {
      await handleCreateCardImage(req, res);
      return;
    }
    if (req.method === "POST" && cleanPath === "/api/cards") {
      await handleSaveCard(req, res);
      return;
    }
    const cardImageMatch = cleanPath.match(/^\/api\/cards\/([a-f0-9]+)\/image\/((?:avatar|cover|case\d+)(?:\.(?:jpg|jpeg|png|webp|gif))?)$/i);
    if ((req.method === "GET" || req.method === "HEAD") && cardImageMatch) {
      await handleGetCardImage(req, res, cardImageMatch[1], cardImageMatch[2]);
      return;
    }
    if (req.method === "GET" && cleanPath.startsWith("/api/cards/")) {
      await handleGetCard(req, res, cleanPath.split("/").pop());
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
