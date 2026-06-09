const placeholderAvatar =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300">
    <defs>
      <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
        <stop stop-color="#06c755"/>
        <stop offset="1" stop-color="#ffd65c"/>
      </linearGradient>
    </defs>
    <rect width="300" height="300" fill="#e9fff2"/>
    <circle cx="150" cy="118" r="54" fill="url(#g)"/>
    <path d="M66 254c13-58 55-86 84-86s71 28 84 86" fill="url(#g)"/>
  </svg>`);

const placeholderCase =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 320">
    <rect width="480" height="320" fill="#f0faf4"/>
    <rect x="42" y="44" width="396" height="232" rx="18" fill="#ffffff" stroke="#06c755" stroke-width="8"/>
    <circle cx="142" cy="132" r="48" fill="#ffd65c"/>
    <path d="M88 238 188 166l70 52 52-40 82 60" fill="none" stroke="#06c755" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`);

const PUBLIC_SITE_URL = "https://chiayi-sme-line-card.onrender.com/";
const LIFF_ID = "2010280088-IG7ReTtB";
const LIFF_URL = `https://liff.line.me/${LIFF_ID}`;
const isLocalPage = ["localhost", "127.0.0.1", ""].includes(window.location.hostname) || window.location.protocol === "file:";
const isRenderPage = window.location.hostname.endsWith(".onrender.com");
const BOT_API_BASE =
  window.LINE_BOT_API_BASE || (isRenderPage ? "" : PUBLIC_SITE_URL.replace(/\/$/, ""));

const themes = [
  {
    name: "LINE 清新",
    colors: {
      pageBg: "#e9fff2",
      cardBg: "#ffffff",
      border: "#06c755",
      text: "#183128",
      muted: "#64726d",
      button: "#06c755",
      buttonText: "#ffffff",
      chipBg: "#e6f9ee",
      caseBg: "#f6faf8",
      accent: "#19a866",
    },
  },
  {
    name: "專業黑金",
    colors: {
      pageBg: "#f4f2ed",
      cardBg: "#151712",
      border: "#d9b65d",
      text: "#fff9ec",
      muted: "#c9c0ae",
      button: "#d9b65d",
      buttonText: "#151712",
      chipBg: "#2a2a22",
      caseBg: "#20221b",
      accent: "#f0cf79",
    },
  },
  {
    name: "甜美粉彩",
    colors: {
      pageBg: "#fff0f5",
      cardBg: "#ffffff",
      border: "#ff8ab3",
      text: "#382431",
      muted: "#7a6070",
      button: "#ff6fa7",
      buttonText: "#ffffff",
      chipBg: "#ffe1ed",
      caseBg: "#fff7fa",
      accent: "#d94d84",
    },
  },
  {
    name: "藍灰商務",
    colors: {
      pageBg: "#edf4f8",
      cardBg: "#ffffff",
      border: "#3a7ca5",
      text: "#172534",
      muted: "#5f6d78",
      button: "#2f6f95",
      buttonText: "#ffffff",
      chipBg: "#e4eff5",
      caseBg: "#f5f9fb",
      accent: "#2f6f95",
    },
  },
];

const defaultState = {
  displayName: "Emma 美學工作室",
  company: "晨光設計有限公司",
  chineseName: "王小晴",
  englishName: "Emma Wang",
  bio: "專門協助小品牌打造一眼就懂的視覺與 LINE 數位名片。從品牌形象、菜單設計到作品展示，讓客戶點進來就知道怎麼聯絡你。",
  products: "品牌設計｜菜單拍攝｜美業作品集｜LINE 官方帳號建置",
  phone: "0912-345-678",
  lineId: "@emma.line",
  address: "台北市信義區松仁路 88 號",
  website: "https://example.com",
  publicCardUrl: "",
  social: "https://instagram.com/example",
  email: "hello@example.com",
  caseTitle: "作品案例 / 精選菜單",
  avatar: placeholderAvatar,
  cover: "",
  avatarShape: "circle",
  avatarEffect: "soft",
  avatarPosX: 50,
  avatarPosY: 50,
  coverPosX: 50,
  coverPosY: 50,
  borderWidth: 2,
  radius: 24,
  colors: { ...themes[0].colors },
  cases: [
    {
      title: "咖啡店春季菜單",
      category: "菜單設計",
      description: "用明亮照片與清楚分類，讓客人快速找到想點的品項。適合餐飲、甜點、飲品品牌。",
      link: "https://example.com/menu",
      image: placeholderCase,
    },
    {
      title: "美甲作品案例",
      category: "作品集",
      description: "把熱門款式、價格與預約連結放在同一張名片中，手機上也能舒服瀏覽。",
      link: "https://example.com/works",
      image: placeholderCase,
    },
  ],
};

let state = loadState();
const saveStatus = document.querySelector("#saveStatus");
const toast = document.querySelector("#toast");
const caseDialog = document.querySelector("#caseDialog");
let isCardMode = hasSharedCard();
let liffReadyPromise = null;
let autoOfficialSendStarted = false;

function getParamFromUrl(name) {
  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const directValue = params.get(name) || hashParams.get(name);
  if (directValue) return directValue;

  const liffState = params.get("liff.state");
  if (!liffState) return "";

  const candidates = [
    liffState,
    liffState.replace(/^[?#]/, ""),
    liffState.includes("?") ? liffState.slice(liffState.indexOf("?") + 1) : "",
    liffState.includes("#") ? liffState.slice(liffState.indexOf("#") + 1) : "",
  ].filter(Boolean);

  for (const candidate of candidates) {
    const value = new URLSearchParams(candidate.replace(/^#/, "")).get(name);
    if (value) return value;
  }

  return "";
}

function getCardParamFromUrl() {
  return getParamFromUrl("card");
}

function hasSharedCard() {
  return Boolean(getCardParamFromUrl());
}

function loadState() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("fresh") === "1" && !getCardParamFromUrl()) {
    localStorage.removeItem("lineCardState");
    window.history.replaceState({}, "", `${window.location.origin}${window.location.pathname}`);
  }

  const sharedState = readStateFromUrl();
  if (sharedState) return sharedState;

  const saved = localStorage.getItem("lineCardState");
  if (!saved) return structuredClone(defaultState);
  try {
    const parsed = JSON.parse(saved);
    return {
      ...structuredClone(defaultState),
      ...parsed,
      colors: { ...defaultState.colors, ...(parsed.colors || {}) },
      cases: Array.isArray(parsed.cases) ? parsed.cases : structuredClone(defaultState.cases),
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function readStateFromUrl() {
  const encoded = getCardParamFromUrl();
  if (!encoded) return null;

  try {
    const decoded = decodeBase64Url(encoded);
    const parsed = JSON.parse(decoded);
    return {
      ...structuredClone(defaultState),
      ...parsed,
      colors: { ...defaultState.colors, ...(parsed.colors || {}) },
      cases: Array.isArray(parsed.cases) ? parsed.cases : structuredClone(defaultState.cases),
    };
  } catch {
    return null;
  }
}

function encodeBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decodeBase64Url(text) {
  const base64 = text.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(text.length / 4) * 4, "=");
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function persist() {
  try {
    localStorage.setItem("lineCardState", JSON.stringify(state));
  } catch (error) {
    console.warn("Local save failed", error);
    showToast("圖片較大，已保留在目前畫面；若重開頁面請重新上傳圖片");
  }
  saveStatus.textContent = "已自動保存";
  window.clearTimeout(persist.timer);
  persist.timer = window.setTimeout(() => {
    saveStatus.textContent = "正在即時預覽";
  }, 1400);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2200);
}

function safeValue(value, fallback = "尚未填寫") {
  return String(value || "").trim() || fallback;
}

function applyMode() {
  document.body.classList.toggle("view-mode", isCardMode);
  document.body.classList.toggle("share-mode", Boolean(getParamFromUrl("cardId")));
  if (getParamFromUrl("cardId")) updateShareModeActions();
}

function loadSharedCardFromCurrentUrl() {
  const sharedState = readStateFromUrl();
  if (!sharedState) return false;
  state = sharedState;
  isCardMode = true;
  applyMode();
  syncInputs();
  render(true);
  return true;
}

function updateShareModeActions() {
  const viewShareButton = document.querySelector("#viewLineShareBtn");
  if (!viewShareButton) return;
  viewShareButton.innerHTML = `<i data-lucide="send"></i>分享給好友`;
}

function makeLiffCardUrl(cardId, extraParams = {}) {
  const params = new URLSearchParams({ cardId });
  Object.entries(extraParams).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return `${LIFF_URL}?${params.toString()}`;
}

async function loadSavedCardFromCurrentUrl() {
  const cardId = getParamFromUrl("cardId");
  if (!cardId) return false;

  try {
    const response = await fetch(`${BOT_API_BASE}/api/cards/${encodeURIComponent(cardId)}`);
    const data = await response.json();
    if (!response.ok || !data.card) throw new Error(data.message || data.error || "card not found");

    state = {
      ...structuredClone(defaultState),
      ...data.card,
      colors: { ...defaultState.colors, ...(data.card.colors || {}) },
      cases: Array.isArray(data.card.cases) ? data.card.cases : structuredClone(defaultState.cases),
    };
    isCardMode = true;
    applyMode();
    updateShareModeActions();
    syncInputs();
    render(true);

    if (getParamFromUrl("share") === "1") showToast("請按分享給好友，選擇要傳送的 LINE 好友");

    if (getParamFromUrl("send") === "official") {
      requestAnimationFrame(() => autoSendOfficialCard());
    }

    return true;
  } catch (error) {
    console.warn("Saved card load failed", error);
    showToast("名片資料讀取失敗，請重新產生名片");
    return false;
  }
}

function makeLink(url) {
  const value = String(url || "").trim();
  if (!value) return "#";
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("mailto:") || value.startsWith("tel:")) {
    return value;
  }
  return `https://${value}`;
}

function buildShareText(publicUrl = state.publicCardUrl) {
  const lines = [
    state.displayName,
    state.company,
    state.bio,
    state.products ? `產品 / 服務：${state.products}` : "",
    publicUrl ? `我的數位名片：${makeLink(publicUrl)}` : "",
    state.phone ? `電話：${state.phone}` : "",
    state.lineId ? `LINE：${state.lineId}` : "",
    state.website ? `網站：${makeLink(state.website)}` : "",
    state.social ? `社群：${makeLink(state.social)}` : "",
    state.email ? `Email：${state.email}` : "",
    state.address ? `地址：${state.address}` : "",
  ].filter((line) => String(line || "").trim());

  const caseLines = state.cases
    .filter((item) => String(item.title || item.link || item.description || "").trim())
    .map((item, index) => {
      const title = item.title || `作品 / 菜單 ${index + 1}`;
      const category = item.category ? `（${item.category}）` : "";
      const link = item.link ? `\n${makeLink(item.link)}` : "\n此項目尚未填寫公開連結";
      return `${index + 1}. ${title}${category}${link}`;
    });

  if (caseLines.length) {
    lines.push("", "作品案例 / 菜單：", ...caseLines);
  }

  return lines.join("\n");
}

function imageForShare(src) {
  if (!src || !src.startsWith("data:")) return src || "";
  return "";
}

function getPortableState() {
  let omittedImages = false;
  const portable = structuredClone(state);
  portable.publicCardUrl = "";

  const avatar = imageForShare(portable.avatar);
  const cover = imageForShare(portable.cover);
  omittedImages ||= Boolean(portable.avatar && !avatar);
  omittedImages ||= Boolean(portable.cover && !cover);
  portable.avatar = avatar === placeholderAvatar ? "" : avatar;
  portable.cover = cover;

  portable.cases = portable.cases.map((item) => {
    const image = imageForShare(item.image);
    omittedImages ||= Boolean(item.image && !image);
    return { ...item, image: image === placeholderCase ? "" : image };
  });

  return { portable, omittedImages };
}

function getShareBaseUrl() {
  if (isLocalPage) return PUBLIC_SITE_URL;
  return `${window.location.origin}${window.location.pathname}`;
}

function makePublicCardUrl() {
  const { portable, omittedImages } = getPortableState();
  const encoded = encodeBase64Url(JSON.stringify(portable));
  const baseUrl = getShareBaseUrl();
  const url = `${baseUrl}#card=${encoded}`;
  return { url, encoded, omittedImages };
}

function clampText(value, limit, fallback = "") {
  const text = String(value || fallback || "").trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1)}…`;
}

function asFlexColor(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(String(value || "")) ? value : fallback;
}

function optionalText(text, options = {}) {
  const value = clampText(text, options.limit || 80);
  if (!value) return null;
  return {
    type: "text",
    text: value,
    size: options.size || "sm",
    color: options.color || asFlexColor(state.colors.muted, "#64726d"),
    wrap: true,
    margin: options.margin || "sm",
    weight: options.weight || "regular",
  };
}

function optionalButton(label, uri, options = {}) {
  const href = makeLink(uri);
  if (!uri || href === "#") return null;
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

function flexImageBox(url, options = {}) {
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

function ensureLiffReady() {
  if (!window.liff || !LIFF_ID) return Promise.resolve(false);
  if (!liffReadyPromise) {
    liffReadyPromise = window.liff.init({ liffId: LIFF_ID }).then(() => true).catch((error) => {
      liffReadyPromise = null;
      throw error;
    });
  }
  return liffReadyPromise;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("伺服器處理逾時，已改用基本名片繼續發送");
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

function buildFlexBusinessCard(publicUrl) {
  const bg = asFlexColor(state.colors.cardBg, "#ffffff");
  const text = asFlexColor(state.colors.text, "#183128");
  const muted = asFlexColor(state.colors.muted, "#64726d");
  const accent = asFlexColor(state.colors.accent, "#19a866");
  const button = asFlexColor(state.colors.button, "#06c755");
  const chipBg = asFlexColor(state.colors.chipBg, "#e6f9ee");
  const caseBg = asFlexColor(state.colors.caseBg, "#f6faf8");

  const productText = clampText(state.products, 220);
  const contactLines = [
    state.phone ? `電話：${state.phone}` : "",
    state.lineId ? `LINE：${state.lineId}` : "",
    state.email ? `Email：${state.email}` : "",
    state.address ? `地址：${state.address}` : "",
  ].filter(Boolean);

  const caseButtons = state.cases
    .filter((item) => String(item.title || item.link || "").trim() && String(item.link || "").trim())
    .slice(0, 3)
    .map((item, index) => optionalButton(item.title || `作品 ${index + 1}`, item.link, { style: "link" }))
    .filter(Boolean);

  const heroTexts = [
    {
      type: "text",
      text: clampText(state.company, 44, "LINE 數位名片"),
      size: "xs",
      weight: "bold",
      color: accent,
      wrap: true,
    },
    {
      type: "text",
      text: clampText(state.displayName, 38, "我的 LINE 數位名片"),
      size: "xl",
      weight: "bold",
      color: text,
      wrap: true,
      margin: "sm",
    },
    optionalText([state.chineseName, state.englishName].filter(Boolean).join(" / "), {
      color: muted,
      limit: 48,
    }),
    optionalText(state.bio, {
      color: text,
      limit: 180,
      margin: "md",
    }),
  ].filter(Boolean);

  const avatarImage = flexImageBox(state.avatar, {
    size: state.avatarShape === "full" ? "full" : "sm",
    aspectRatio: state.avatarShape === "full" ? "20:9" : "1:1",
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

  if (productText) {
    contents.push({
      type: "box",
      layout: "vertical",
      margin: "md",
      backgroundColor: caseBg,
      cornerRadius: "md",
      paddingAll: "12px",
      contents: [
        { type: "text", text: "產品 / 服務", size: "xs", weight: "bold", color: accent },
        { type: "text", text: productText, size: "sm", color: muted, wrap: true, margin: "xs" },
      ],
    });
  }

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

  const caseSummaries = (Array.isArray(state.cases) ? state.cases : [])
    .filter((item) => String(item.title || item.category || item.description || item.image || "").trim())
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
        { type: "text", text: clampText(state.caseTitle, 40, "作品案例 / 精選菜單"), size: "xs", weight: "bold", color: accent },
        ...caseSummaries.map((item, index) => ({
          type: "box",
          layout: "vertical",
          margin: index === 0 ? "xs" : "sm",
          contents: [
            item.image ? flexImageBox(item.image, { aspectRatio: "16:9", margin: "xs" }) : null,
            { type: "text", text: clampText(item.title, 42, `作品 ${index + 1}`), size: "sm", weight: "bold", color: text, wrap: true },
            item.category ? { type: "text", text: clampText(item.category, 36), size: "xs", color: accent, wrap: true, margin: "xs" } : null,
            item.description ? { type: "text", text: clampText(item.description, 90), size: "xs", color: muted, wrap: true, margin: "xs" } : null,
          ].filter(Boolean),
        })),
      ],
    });
  }

  const footerButtons = [
    optionalButton("查看完整名片", publicUrl, { style: "primary" }),
    optionalButton("撥打電話", state.phone ? `tel:${state.phone.replace(/[^\d+]/g, "")}` : "", { style: "link" }),
    optionalButton("加 LINE", makeLineProfileUrl(state.lineId), { style: "link" }),
    optionalButton("官方網站", state.website, { style: "link" }),
    optionalButton("社群連結", state.social, { style: "link" }),
    ...caseButtons,
  ].filter(Boolean);

  const primaryFooterButton = footerButtons.find((item) => item.style === "primary");
  if (primaryFooterButton) {
    primaryFooterButton.color = button;
    primaryFooterButton.action.label = "查看完整名片";
  }

  return {
    type: "flex",
    altText: clampText(`${state.displayName || "我的"} LINE 數位名片`, 400),
    contents: {
      type: "bubble",
      size: "mega",
      hero: state.cover
        ? flexImageBox(state.cover, {
            aspectRatio: "20:9",
          })
        : undefined,
      body: {
        type: "box",
        layout: "vertical",
        backgroundColor: bg,
        paddingAll: "12px",
        contents: [
          {
            type: "box",
            layout: "vertical",
            borderColor: asFlexColor(state.colors.border, "#06c755"),
            borderWidth: "2px",
            cornerRadius: "lg",
            paddingAll: "14px",
            spacing: "md",
            contents,
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        backgroundColor: bg,
        contents: footerButtons.length
          ? footerButtons
          : [
              {
                type: "text",
                text: "請在名片中加入至少一個可點擊連結",
                size: "sm",
                color: muted,
                wrap: true,
              },
            ],
      },
      styles: {
        footer: {
          separator: true,
          separatorColor: asFlexColor(state.colors.border, "#06c755"),
        },
      },
    },
  };
}

async function uploadGeneratedCardImage(dataUrl) {
  const response = await fetch(`${BOT_API_BASE}/api/upload-images`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ images: [{ key: "cardImage", dataUrl }] }),
  });
  const data = await response.json().catch(() => ({}));
  const imageUrl = data.uploads?.cardImage;
  if (!response.ok || !isPublicImageUrl(imageUrl)) return null;

  return {
    type: "image",
    originalContentUrl: imageUrl,
    previewImageUrl: imageUrl,
  };
}

async function createServerCardImageMessage(card) {
  const response = await fetchWithTimeout(`${BOT_API_BASE}/api/card-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ card }),
  }, 12000);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.imageMessage) {
    throw new Error(data.message || data.error || "card image failed");
  }
  return data.imageMessage;
}

function drawRoundRect(context, x, y, width, height, radius, fill) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
  context.fillStyle = fill;
  context.fill();
}

function wrapTextLines(context, text, maxWidth, maxLines = 5) {
  const chars = String(text || "").trim().split("");
  const lines = [];
  let line = "";
  for (const char of chars) {
    const test = line + char;
    if (context.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = char;
      if (lines.length >= maxLines) break;
    } else {
      line = test;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

function drawWrappedText(context, text, x, y, maxWidth, lineHeight, maxLines = 5) {
  const lines = wrapTextLines(context, text, maxWidth, maxLines);
  lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
  return lines.length * lineHeight;
}

function loadCanvasImage(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    window.setTimeout(() => resolve(null), 5000);
    image.src = src;
  });
}

function drawCoverImage(context, image, x, y, width, height) {
  if (!image) {
    const gradient = context.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, "#5ddf8a");
    gradient.addColorStop(1, "#ffe16b");
    drawRoundRect(context, x, y, width, height, 28, gradient);
    return;
  }
  context.save();
  drawRoundRect(context, x, y, width, height, 28, "#ffffff");
  context.clip();
  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
  context.restore();
}

async function createCardPosterDataUrl(card = state) {
  const width = 900;
  const height = 2100;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  const colors = { ...themes[0].colors, ...(card.colors || {}) };
  const pageBg = asFlexColor(colors.pageBg, "#e9fff2");
  const cardBg = asFlexColor(colors.cardBg, "#ffffff");
  const text = asFlexColor(colors.text, "#183128");
  const muted = asFlexColor(colors.muted, "#64726d");
  const accent = asFlexColor(colors.accent, "#19a866");
  const border = asFlexColor(colors.border, "#06c755");
  const chipBg = asFlexColor(colors.chipBg, "#e6f9ee");
  const caseBg = asFlexColor(colors.caseBg, "#f6faf8");

  context.fillStyle = pageBg;
  context.fillRect(0, 0, width, height);
  drawRoundRect(context, 40, 40, 820, height - 80, 34, cardBg);
  context.strokeStyle = border;
  context.lineWidth = 5;
  context.stroke();

  const coverImage = await loadCanvasImage(card.cover);
  drawCoverImage(context, coverImage, 70, 70, 760, 260);

  const avatarImage = await loadCanvasImage(card.avatar);
  context.save();
  context.beginPath();
  context.arc(175, 345, 80, 0, Math.PI * 2);
  context.fillStyle = "#ffffff";
  context.fill();
  context.clip();
  if (avatarImage) {
    const scale = Math.max(160 / avatarImage.width, 160 / avatarImage.height);
    const drawWidth = avatarImage.width * scale;
    const drawHeight = avatarImage.height * scale;
    context.drawImage(avatarImage, 95 + (160 - drawWidth) / 2, 265 + (160 - drawHeight) / 2, drawWidth, drawHeight);
  } else {
    context.fillStyle = chipBg;
    context.fillRect(95, 265, 160, 160);
  }
  context.restore();

  let y = 470;
  context.fillStyle = accent;
  context.font = "700 28px 'Noto Sans TC', sans-serif";
  context.fillText(safeValue(card.company, ""), 90, y);
  y += 56;
  context.fillStyle = text;
  context.font = "900 48px 'Noto Sans TC', sans-serif";
  y += drawWrappedText(context, safeValue(card.displayName, "LINE 數位名片"), 90, y, 720, 58, 2);
  context.fillStyle = muted;
  context.font = "500 30px 'Noto Sans TC', sans-serif";
  const names = [card.chineseName, card.englishName].filter(Boolean).join(" / ");
  if (names) {
    context.fillText(names, 90, y + 10);
    y += 54;
  }
  context.fillStyle = text;
  context.font = "400 30px 'Noto Sans TC', sans-serif";
  y += drawWrappedText(context, card.bio, 90, y + 20, 720, 46, 4) + 30;

  drawRoundRect(context, 90, y, 720, 150, 18, caseBg);
  context.fillStyle = text;
  context.font = "800 30px 'Noto Sans TC', sans-serif";
  context.fillText("\u7522\u54c1 / \u670d\u52d9", 120, y + 48);
  context.fillStyle = muted;
  context.font = "400 28px 'Noto Sans TC', sans-serif";
  drawWrappedText(context, card.products, 120, y + 92, 660, 40, 2);
  y += 190;

  context.fillStyle = muted;
  context.font = "400 26px 'Noto Sans TC', sans-serif";
  [
    card.phone ? `\u96fb\u8a71\uff1a${card.phone}` : "",
    card.lineId ? `LINE\uff1a${card.lineId}` : "",
    card.email ? `Email\uff1a${card.email}` : "",
    card.address ? `\u5730\u5740\uff1a${card.address}` : "",
    card.website ? `\u7db2\u7ad9\uff1a${card.website}` : "",
    card.social ? `\u793e\u7fa4\uff1a${card.social}` : "",
  ].filter(Boolean).slice(0, 6).forEach((line) => {
    y += drawWrappedText(context, line, 90, y, 720, 38, 2);
  });
  y += 24;

  const cases = (Array.isArray(card.cases) ? card.cases : [])
    .filter((item) => String(item.title || item.category || item.description || item.image || "").trim())
    .slice(0, 2);
  if (cases.length) {
    drawRoundRect(context, 90, y, 720, 110 + cases.length * 200, 18, caseBg);
    context.fillStyle = accent;
    context.font = "800 28px 'Noto Sans TC', sans-serif";
    context.fillText(safeValue(card.caseTitle, "\u7cbe\u9078\u5546\u54c1"), 120, y + 46);
    y += 78;
    for (const [index, item] of cases.entries()) {
      const caseImage = await loadCanvasImage(item.image);
      if (caseImage) {
        drawCoverImage(context, caseImage, 120, y, 210, 120);
      }
      const textX = caseImage ? 350 : 120;
      context.fillStyle = text;
      context.font = "800 27px 'Noto Sans TC', sans-serif";
      context.fillText(safeValue(item.title, `\u5546\u54c1 ${index + 1}`), textX, y + 32);
      context.fillStyle = accent;
      context.font = "700 23px 'Noto Sans TC', sans-serif";
      if (item.category) context.fillText(item.category, textX, y + 68);
      context.fillStyle = muted;
      context.font = "400 22px 'Noto Sans TC', sans-serif";
      drawWrappedText(context, item.description, textX, y + 102, caseImage ? 420 : 650, 30, 2);
      y += 190;
    }
  }

  return canvas.toDataURL("image/jpeg", 0.84);
}

async function createCardScreenshotMessage(card = state) {
  let dataUrl = "";
  try {
    dataUrl = await createCardPosterDataUrl(card);
  } catch (error) {
    console.warn("Canvas card poster failed", error);
  }
  if (!dataUrl && window.html2canvas) {
    const cardElement = document.querySelector("#cardCanvas");
    if (cardElement) {
      const canvas = await window.html2canvas(cardElement, {
        backgroundColor: null,
        scale: Math.min(window.devicePixelRatio || 1.5, 1.5),
        useCORS: true,
      });
      dataUrl = canvas.toDataURL("image/jpeg", 0.82);
    }
  }
  if (!dataUrl) return null;
  return uploadGeneratedCardImage(dataUrl);
}

async function buildFriendShareMessages(publicUrl) {
  let screenshotMessage = null;
  try {
    screenshotMessage = await createServerCardImageMessage(state);
  } catch (error) {
    console.warn("Server card share image failed", error);
    screenshotMessage = await createCardScreenshotMessage(state).catch((fallbackError) => {
      console.warn("Card screenshot share image failed", fallbackError);
      return null;
    });
  }

  return [screenshotMessage, buildFlexBusinessCard(publicUrl)].filter(Boolean);
}

async function shareFlexCardToLine(url) {
  if (!window.liff || !LIFF_ID) return "unavailable";

  await ensureLiffReady();

  if (!window.liff.isInClient()) {
    return "external";
  }

  if (!window.liff.isLoggedIn()) {
    window.liff.login({ redirectUri: window.location.href });
    return "login";
  }

  if (!window.liff.isApiAvailable("shareTargetPicker")) {
    return "unavailable";
  }

  const result = await window.liff.shareTargetPicker(await buildFriendShareMessages(url));
  return result ? "shared" : "cancelled";
}

function isLocalDataImage(src) {
  return /^data:image\/(?:jpeg|png|webp|gif|svg\+xml);/i.test(String(src || ""));
}

function shouldUploadImage(src, placeholder) {
  return isLocalDataImage(src) && src !== placeholder;
}

function resizeDataImage(dataUrl, maxWidth = 1200, maxHeight = 1200) {
  return new Promise((resolve) => {
    if (!isLocalDataImage(dataUrl) || dataUrl.startsWith("data:image/gif") || dataUrl.startsWith("data:image/svg")) {
      resolve(dataUrl);
      return;
    }

    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.86));
    };
    image.onerror = () => resolve(dataUrl);
    image.src = dataUrl;
  });
}

async function createAvatarShareImage(dataUrl) {
  if (!isLocalDataImage(dataUrl) || dataUrl.startsWith("data:image/gif") || dataUrl.startsWith("data:image/svg")) {
    return resizeDataImage(dataUrl, 600, 600);
  }

  const image = await loadCanvasImage(dataUrl);
  if (!image) return resizeDataImage(dataUrl, 600, 600);

  const isFull = state.avatarShape === "full";
  const size = isFull ? { width: 1200, height: 600 } : { width: 600, height: 600 };
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, size.width, size.height);

  context.save();
  if (state.avatarShape === "circle") {
    context.beginPath();
    context.arc(size.width / 2, size.height / 2, Math.min(size.width, size.height) / 2, 0, Math.PI * 2);
    context.clip();
  }

  const scale = Math.max(size.width / image.width, size.height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  context.drawImage(image, (size.width - drawWidth) / 2, (size.height - drawHeight) / 2, drawWidth, drawHeight);
  context.restore();

  return state.avatarShape === "circle" ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.86);
}

async function buildOfficialCardWithImages() {
  const { portable, omittedImages } = getPortableState();
  const images = [];

  if (shouldUploadImage(state.avatar, placeholderAvatar)) {
    images.push({
      key: "avatar",
      dataUrl: await createAvatarShareImage(state.avatar),
    });
  }

  if (shouldUploadImage(state.cover, "")) {
    images.push({
      key: "cover",
      dataUrl: await resizeDataImage(state.cover, 1400, 700),
    });
  }

  for (const [index, item] of (Array.isArray(state.cases) ? state.cases : []).slice(0, 3).entries()) {
    if (shouldUploadImage(item.image, placeholderCase)) {
      images.push({
        key: `case${index}`,
        dataUrl: await resizeDataImage(item.image, 1000, 700),
      });
    }
  }

  if (!images.length) return { card: portable, omittedImages };

  const response = await fetch(`${BOT_API_BASE}/api/upload-images`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ images }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.error || "圖片上傳失敗");
  }

  return {
    card: {
      ...portable,
      avatar: data.uploads?.avatar || portable.avatar,
      cover: data.uploads?.cover || portable.cover,
      cases: portable.cases.map((item, index) => ({
        ...item,
        image: data.uploads?.[`case${index}`] || item.image,
      })),
    },
    omittedImages,
  };
}

async function saveCardSnapshot(card) {
  const response = await fetch(`${BOT_API_BASE}/api/cards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ card }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.id) {
    throw new Error(data.message || data.error || "save card failed");
  }
  return data;
}

async function saveOfficialCard(card) {
  const data = await saveCardSnapshot(card);
  return makeLiffCardUrl(data.id);
}
async function sendCardByOfficialAccount(url, encoded) {
  if (!window.liff || !LIFF_ID) return "unavailable";

  await ensureLiffReady();

  if (!window.liff.isInClient()) {
    try {
      const officialCard = await buildOfficialCardWithImages();
      const savedOfficial = await saveCardSnapshot(officialCard.card);
      window.location.href = makeLiffCardUrl(savedOfficial.id, { send: "official" });
    } catch (error) {
      console.warn("External official card save failed", error);
      window.location.href = `${LIFF_URL}?card=${encoded}`;
    }
    return "external";
  }

  if (!window.liff.isLoggedIn()) {
    window.liff.login({ redirectUri: window.location.href });
    return "login";
  }

  let canCheckFriendship = true;
  if (typeof window.liff.getFriendship === "function") {
    try {
      const friendship = await window.liff.getFriendship();
      if (!friendship.friendFlag) {
        if (typeof window.liff.requestFriendship !== "function") {
          return "not-friend";
        }
        await window.liff.requestFriendship();
        await new Promise((resolve) => window.setTimeout(resolve, 900));
        const updatedFriendship = await window.liff.getFriendship();
        if (!updatedFriendship.friendFlag) return "not-friend";
      }
    } catch (error) {
      console.warn("LINE friendship check failed", error);
      canCheckFriendship = false;
    }
  }

  if (!canCheckFriendship && typeof window.liff.requestFriendship === "function") {
    try {
      await window.liff.requestFriendship();
    } catch (error) {
      console.warn("LINE friendship request failed", error);
    }
  }

  const idToken = window.liff.getIDToken();
  if (!idToken) return "no-token";

  const officialCard = await buildOfficialCardWithImages();
  let officialPublicUrl = url;
  let officialMessageCard = officialCard.card;
  try {
    const savedOfficial = await saveCardSnapshot(officialCard.card);
    officialPublicUrl = makeLiffCardUrl(savedOfficial.id);
    officialMessageCard = savedOfficial.card || officialCard.card;
  } catch (error) {
    console.warn("Saved card URL failed", error);
  }
  showToast("正在合成包含照片的名片圖片");
  let cardImageMessage = await createCardScreenshotMessage(officialMessageCard).catch((error) => {
    console.warn("Official client card image failed", error);
    return null;
  });
  if (!cardImageMessage) {
    cardImageMessage = await createServerCardImageMessage(officialMessageCard).catch((error) => {
      console.warn("Official server card image failed", error);
      return null;
    });
  }

  showToast(cardImageMessage ? "正在由官方帳號發送完整圖片名片" : "圖片產生失敗，先發送可點擊名片");
  const response = await fetchWithTimeout(`${BOT_API_BASE}/api/send-card`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      idToken,
      publicUrl: officialPublicUrl,
      card: officialMessageCard,
      imageMessage: cardImageMessage,
    }),
  }, 20000);

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.message || data.error || "官方帳號後端尚未完成設定";
    throw new Error(message);
  }

  return "sent";
}

function clearAutoOfficialSendParam() {
  const cleanUrl = new URL(window.location.href);
  cleanUrl.searchParams.delete("send");
  const liffState = cleanUrl.searchParams.get("liff.state");
  if (liffState) {
    const stateParams = new URLSearchParams(liffState.replace(/^[?#]/, ""));
    stateParams.delete("send");
    const nextState = stateParams.toString();
    if (nextState) cleanUrl.searchParams.set("liff.state", `?${nextState}`);
    else cleanUrl.searchParams.delete("liff.state");
  }
  window.history.replaceState({}, "", cleanUrl.toString());
}

async function autoSendOfficialCard() {
  if (autoOfficialSendStarted) return;
  autoOfficialSendStarted = true;
  showToast("正在接續由官方帳號發送名片");
  await handleOfficialSendClick({ auto: true });
}

async function handleLineShareClick(event, trigger) {
  event?.preventDefault();
  showToast("\u6b63\u5728\u7522\u751f\u540d\u7247\u5716\u7247\u4e26\u958b\u555f LINE \u597d\u53cb\u9078\u64c7");
  let { url, encoded, omittedImages } = preparePublicShare();
  const cardId = getParamFromUrl("cardId");
  if (cardId) {
    url = `${LIFF_URL}?cardId=${encodeURIComponent(cardId)}`;
  }

  try {
    const shareSnapshot = await buildOfficialCardWithImages();
    const savedShare = await saveCardSnapshot(shareSnapshot.card);
    if (savedShare.id) {
      url = `${LIFF_URL}?cardId=${encodeURIComponent(savedShare.id)}`;
      omittedImages = shareSnapshot.omittedImages;
      if (savedShare.card) {
        state = {
          ...state,
          ...savedShare.card,
          colors: { ...state.colors, ...(savedShare.card.colors || {}) },
          cases: Array.isArray(savedShare.card.cases) ? savedShare.card.cases : state.cases,
        };
      }
    }
  } catch (error) {
    console.warn("Saved friend share card failed", error);
  }

  try {
    const shareStatus = await shareFlexCardToLine(url);
    if (shareStatus === "shared") {
      showToast(`\u5df2\u958b\u555f LINE \u5206\u4eab${omittedImages ? "\uff0c\u90e8\u5206\u672c\u6a5f\u5716\u7247\u6703\u6539\u7528\u9023\u7d50\u5448\u73fe" : ""}`);
      return;
    }
    if (shareStatus === "external") {
      const liffLink = url.startsWith(LIFF_URL) ? url : `${LIFF_URL}?card=${encoded}`;
      if (trigger) trigger.href = liffLink;
      showToast("\u8acb\u5728 LINE App \u88e1\u958b\u555f\u5f8c\u518d\u6309\u5206\u4eab\u7d66\u597d\u53cb");
      window.setTimeout(() => {
        window.location.href = liffLink;
      }, 500);
      return;
    }
    if (shareStatus === "login") {
      showToast("\u8acb\u5148\u5b8c\u6210 LINE \u767b\u5165\uff0c\u56de\u4f86\u5f8c\u518d\u6309\u4e00\u6b21\u5206\u4eab\u7d66\u597d\u53cb");
      return;
    }
    if (shareStatus === "cancelled") {
      showToast("\u5df2\u53d6\u6d88 LINE \u5206\u4eab");
      return;
    }
    if (shareStatus === "unavailable") {
      showToast("LINE \u597d\u53cb\u9078\u64c7\u529f\u80fd\u5c1a\u672a\u555f\u7528\uff0c\u8acb\u5230 LINE Developers \u7684 LIFF \u958b\u555f shareTargetPicker");
      return;
    }
  } catch (error) {
    console.warn("LINE LIFF share failed", error);
    if (window.liff?.isInClient?.()) {
      showToast(`\u5206\u4eab\u7d66\u597d\u53cb\u6c92\u6709\u6253\u958b\uff1a${error.message || "\u8acb\u78ba\u8a8d shareTargetPicker \u5df2\u555f\u7528"}`);
      return;
    }
  }

  const liffLink = url.startsWith(LIFF_URL) ? url : `${LIFF_URL}?card=${encoded}`;
  const copied = await copyText(url);
  if (trigger) trigger.href = liffLink;
  showToast(copied ? "\u5df2\u8907\u88fd\u540d\u7247\u9023\u7d50\uff0c\u8acb\u7528 LINE App \u958b\u555f\u5f8c\u5206\u4eab" : "\u8acb\u7528 LINE App \u958b\u555f\u5f8c\u5206\u4eab");
  window.setTimeout(() => {
    window.location.href = liffLink;
  }, 500);
}
async function handleOfficialSendClick(options = {}) {
  showToast("正在處理圖片並發送名片");
  const { url, encoded } = preparePublicShare();
  try {
    const status = await sendCardByOfficialAccount(url, encoded);
    if (status === "sent") {
      if (options.auto) clearAutoOfficialSendParam();
      showToast("官方帳號已發送完整名片");
      return;
    }
    if (status === "external") {
      showToast("正在開啟 LINE，請在 LINE 裡再按一次官方帳號發送");
      return;
    }
    if (status === "login") {
      showToast("正在前往 LINE 授權，完成後再按一次官方帳號發送");
      return;
    }
    if (status === "not-friend") {
      showToast("請先加入官方帳號好友，再按一次官方帳號發送");
      return;
    }
    if (status === "no-token") {
      showToast("LINE 授權尚未完成，請重新開啟 LIFF 後再試一次");
      return;
    }
  } catch (error) {
    console.warn("Official account send failed", error);
    showToast(error.message || "官方帳號發送失敗，請確認已加入官方帳號");
  }
}

function preparePublicShare() {
  const { url, encoded, omittedImages } = makePublicCardUrl();
  state.publicCardUrl = url;
  syncInputs();
  persist();
  return { url, encoded, omittedImages };
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
  }
}

function renderThemeButtons() {
  const themeGrid = document.querySelector("#themeGrid");
  themeGrid.innerHTML = "";
  themes.forEach((theme) => {
    const button = document.createElement("button");
    button.className = "theme-btn";
    button.type = "button";
    button.innerHTML = `
      <span class="theme-dots">
        <span style="background:${theme.colors.cardBg}"></span>
        <span style="background:${theme.colors.button}"></span>
        <span style="background:${theme.colors.accent}"></span>
      </span>
      <span>${theme.name}</span>
    `;
    button.addEventListener("click", () => {
      state.colors = { ...theme.colors };
      syncInputs();
      render();
      persist();
    });
    themeGrid.append(button);
  });
}

function syncInputs() {
  document.querySelectorAll("[data-field]").forEach((input) => {
    const key = input.dataset.field;
    input.value = state[key] ?? "";
  });

  document.querySelectorAll("[data-color]").forEach((input) => {
    input.value = state.colors[input.dataset.color] || "#000000";
  });

  document.querySelectorAll("[data-avatar-shape]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.avatarShape === state.avatarShape);
  });
}

function renderContacts() {
  const contacts = [
    ["map-pin", state.address],
    ["phone", state.phone],
    ["message-circle", `LINE：${state.lineId}`],
    ["globe", state.website],
    ["instagram", state.social],
    ["mail", state.email],
  ].filter(([, value]) => String(value || "").trim());

  document.querySelector("#previewContacts").innerHTML = contacts
    .map(([icon, value]) => `<div class="contact-item"><i data-lucide="${icon}"></i><span>${value}</span></div>`)
    .join("");
}

function renderCases() {
  const previewCases = document.querySelector("#previewCases");
  previewCases.innerHTML = "";

  state.cases.forEach((item, index) => {
    const button = document.createElement("button");
    button.className = "case-card";
    button.type = "button";
    button.innerHTML = `
      <img src="${item.image || placeholderCase}" alt="">
      <span>
        <p>${safeValue(item.category, "案例")}</p>
        <strong>${safeValue(item.title, `案例 ${index + 1}`)}</strong>
        <small>${safeValue(item.description, "點開查看詳細介紹")}</small>
      </span>
      <i data-lucide="chevron-right"></i>
    `;
    button.addEventListener("click", () => openCaseDialog(item));
    previewCases.append(button);
  });
}

function renderCaseEditors() {
  const list = document.querySelector("#caseEditorList");
  list.innerHTML = "";

  state.cases.forEach((item, index) => {
    const box = document.createElement("div");
    box.className = "case-editor";
    box.innerHTML = `
      <div class="case-editor-head">
        <strong>項目 ${index + 1}：${safeValue(item.title, "未命名")}</strong>
        <button class="icon-btn" type="button" data-delete-case="${index}" aria-label="刪除案例">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
      <div class="grid-2">
        <label>標題
          <input type="text" value="${escapeAttr(item.title)}" data-case-index="${index}" data-case-field="title">
        </label>
        <label>分類 / 價格
          <input type="text" value="${escapeAttr(item.category)}" data-case-index="${index}" data-case-field="category">
        </label>
      </div>
      <label>介紹
        <textarea rows="3" data-case-index="${index}" data-case-field="description">${escapeHtml(item.description)}</textarea>
      </label>
      <div class="case-image-row">
        <label>詳細連結
          <input type="url" value="${escapeAttr(item.link)}" data-case-index="${index}" data-case-field="link">
        </label>
        <label class="file-mini">
          <input type="file" accept="image/*" data-case-upload="${index}">
          <i data-lucide="image-plus"></i>
          換圖片
        </label>
      </div>
    `;
    list.append(box);
  });
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttr(value = "") {
  return escapeHtml(value).replaceAll('"', "&quot;");
}

function openCaseDialog(item) {
  document.querySelector("#dialogImage").src = item.image || placeholderCase;
  document.querySelector("#dialogCategory").textContent = safeValue(item.category, "案例");
  document.querySelector("#dialogTitle").textContent = safeValue(item.title, "未命名案例");
  document.querySelector("#dialogDescription").textContent = safeValue(item.description, "尚未填寫詳細介紹。");
  const link = document.querySelector("#dialogLink");
  link.href = makeLink(item.link);
  link.hidden = !String(item.link || "").trim();
  caseDialog.showModal();
}

function render(shouldRenderEditors = false) {
  const card = document.querySelector("#cardCanvas");
  Object.entries(state.colors).forEach(([key, value]) => {
    const cssKey = key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
    card.style.setProperty(`--${cssKey}`, value);
  });
  card.style.setProperty("--card-border", state.colors.border);
  card.style.setProperty("--text-color", state.colors.text);
  card.style.setProperty("--muted-color", state.colors.muted);
  card.style.setProperty("--button-color", state.colors.button);
  card.style.setProperty("--button-text", state.colors.buttonText);
  card.style.setProperty("--accent-color", state.colors.accent);
  card.style.setProperty("--card-border-width", `${state.borderWidth}px`);
  card.style.setProperty("--card-radius", `${state.radius}px`);
  document.body.style.setProperty("--shell-bg", state.colors.pageBg);

  const cover = document.querySelector("#previewCover");
  cover.style.backgroundImage = state.cover
    ? `linear-gradient(rgba(0,0,0,.06), rgba(0,0,0,.08)), url("${state.cover}")`
    : "";
  cover.style.backgroundPosition = `${state.coverPosX}% ${state.coverPosY}%`;

  const previewAvatar = document.querySelector("#previewAvatar");
  previewAvatar.src = state.avatar || placeholderAvatar;
  previewAvatar.style.objectPosition = `${state.avatarPosX}% ${state.avatarPosY}%`;
  const avatarWrap = document.querySelector("#avatarWrap");
  avatarWrap.className = `avatar-wrap ${state.avatarShape} effect-${state.avatarEffect}`;

  document.querySelector("#previewCompany").textContent = safeValue(state.company, "");
  document.querySelector("#previewDisplayName").textContent = safeValue(state.displayName, "請輸入名片名稱");
  document.querySelector("#previewChineseName").textContent = safeValue(state.chineseName, "");
  document.querySelector("#previewEnglishName").textContent = safeValue(state.englishName, "");
  document.querySelector("#previewBio").textContent = safeValue(state.bio, "請在左邊輸入介紹。");
  document.querySelector("#previewProducts").textContent = safeValue(state.products, "請輸入產品或服務。");
  document.querySelector("#previewCaseTitle").textContent = safeValue(state.caseTitle, "作品案例 / 精選菜單");

  document.querySelector("#phoneAction").href = state.phone ? `tel:${state.phone.replace(/[^\d+]/g, "")}` : "#";
  document.querySelector("#lineAction").href = state.lineId ? `https://line.me/R/ti/p/${encodeURIComponent(state.lineId)}` : "#";
  document.querySelector("#webAction").href = makeLink(state.website);

  renderContacts();
  renderCases();
  if (shouldRenderEditors) renderCaseEditors();
  if (window.lucide) window.lucide.createIcons();
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function fileToOptimizedDataUrl(file, options = {}) {
  const maxWidth = options.maxWidth || 1200;
  const maxHeight = options.maxHeight || 1200;
  let imageFile = file;
  const isHeic =
    /image\/hei[cf]/i.test(file.type || "") ||
    /\.(?:heic|heif)$/i.test(file.name || "");

  if (isHeic) {
    if (typeof window.heic2any !== "function") {
      throw new Error("HEIC 圖片轉換工具尚未載入，請稍後再試");
    }
    const converted = await window.heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.88,
    });
    imageFile = Array.isArray(converted) ? converted[0] : converted;
  }

  if (!String(imageFile.type || "").startsWith("image/")) {
    throw new Error("請選擇 JPEG、PNG、WebP 或 HEIC 圖片");
  }

  const dataUrl = await fileToDataUrl(imageFile);
  return resizeDataImage(dataUrl, maxWidth, maxHeight);
}

function attachEvents() {
  document.querySelectorAll("[data-field]").forEach((input) => {
    input.addEventListener("input", () => {
      const key = input.dataset.field;
      state[key] = input.type === "range" ? Number(input.value) : input.value;
      render(false);
      persist();
    });
  });

  document.querySelectorAll("[data-color]").forEach((input) => {
    input.addEventListener("input", () => {
      state.colors[input.dataset.color] = input.value;
      render(false);
      persist();
    });
  });

  document.querySelectorAll("[data-avatar-shape]").forEach((button) => {
    button.addEventListener("click", () => {
      state.avatarShape = button.dataset.avatarShape;
      syncInputs();
      render(false);
      persist();
    });
  });

  document.querySelector("#avatarUpload").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      showToast("正在處理大頭貼圖片");
      state.avatar = await fileToOptimizedDataUrl(file, { maxWidth: 800, maxHeight: 800 });
      render(false);
      persist();
      showToast("大頭貼已上傳");
    } catch (error) {
      console.warn("Avatar upload failed", error);
      showToast("大頭貼處理失敗，請換一張較小的圖片");
    }
  });

  document.querySelector("#coverUpload").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      showToast("正在處理封面圖片");
      state.cover = await fileToOptimizedDataUrl(file, { maxWidth: 1400, maxHeight: 800 });
      render(false);
      persist();
      showToast("封面圖片已上傳");
    } catch (error) {
      console.warn("Cover upload failed", error);
      showToast("封面圖片處理失敗，請換一張較小的圖片");
    }
  });

  document.querySelector("#addCaseBtn").addEventListener("click", () => {
    state.cases.push({
      title: "新的作品 / 菜單",
      category: "分類",
      description: "在這裡輸入詳細介紹，客人點開後就會看到。",
      link: "",
      image: placeholderCase,
    });
    render(true);
    persist();
  });

  document.querySelector("#caseEditorList").addEventListener("input", (event) => {
    const target = event.target;
    if (!target.matches("[data-case-field]")) return;
    const index = Number(target.dataset.caseIndex);
    state.cases[index][target.dataset.caseField] = target.value;
    render(false);
    persist();
  });

  document.querySelector("#caseEditorList").addEventListener("click", (event) => {
    const deleteButton = event.target.closest("[data-delete-case]");
    if (!deleteButton) return;
    const index = Number(deleteButton.dataset.deleteCase);
    state.cases.splice(index, 1);
    render(true);
    persist();
    showToast("已刪除項目");
  });

  document.querySelector("#caseEditorList").addEventListener("change", async (event) => {
    const upload = event.target.closest("[data-case-upload]");
    if (!upload) return;
    const file = upload.files?.[0];
    if (!file) return;
    const index = Number(upload.dataset.caseUpload);
    try {
      showToast("正在處理案例圖片");
      state.cases[index].image = await fileToOptimizedDataUrl(file, { maxWidth: 1200, maxHeight: 900 });
      render(false);
      persist();
      showToast("案例圖片已上傳");
    } catch (error) {
      console.warn("Case image upload failed", error);
      showToast("案例圖片處理失敗，請換一張較小的圖片");
    }
  });

  document.querySelector("#resetBtn").addEventListener("click", () => {
    state = structuredClone(defaultState);
    syncInputs();
    render(true);
    persist();
    showToast("已回到範例內容");
  });

  document.querySelector("#copyShareBtn").addEventListener("click", async () => {
    const { url, omittedImages } = preparePublicShare();
    const copied = await copyText(buildShareText(url));
    showToast(copied ? `可點擊分享文字已複製${omittedImages ? "，部分大圖未放入連結" : ""}` : "無法自動複製，請改用分享 LINE");
  });

  document.querySelector("#lineShareBtn").addEventListener("click", (event) => {
    handleLineShareClick(event, event.currentTarget);
  });

  document.querySelector("#viewLineShareBtn").addEventListener("click", (event) => {
    handleLineShareClick(event, event.currentTarget);
  });

  document.querySelector("#officialSendBtn").addEventListener("click", handleOfficialSendClick);
  document.querySelector("#viewOfficialSendBtn").addEventListener("click", handleOfficialSendClick);

  document.querySelector("#publicLinkBtn").addEventListener("click", async () => {
    const { url, omittedImages } = preparePublicShare();
    const copied = await copyText(url);
    showToast(copied ? `公開名片連結已複製${omittedImages ? "，部分大圖未放入連結" : ""}` : "公開名片連結已產生");
  });

  document.querySelector("#editModeBtn").addEventListener("click", () => {
    isCardMode = false;
    window.history.replaceState({}, "", `${window.location.origin}${window.location.pathname}`);
    persist();
    applyMode();
    syncInputs();
    render(true);
  });

  document.querySelector("#downloadBtn").addEventListener("click", async () => {
    if (!window.html2canvas) {
      showToast("圖片工具載入中，請稍後再試");
      return;
    }
    const canvas = await window.html2canvas(document.querySelector("#cardCanvas"), {
      backgroundColor: null,
      scale: Math.min(window.devicePixelRatio || 2, 3),
      useCORS: true,
    });
    const link = document.createElement("a");
    link.download = "line-digital-card.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    showToast("已下載名片圖片");
  });

  document.querySelector("#closeDialogBtn").addEventListener("click", () => caseDialog.close());
  caseDialog.addEventListener("click", (event) => {
    if (event.target === caseDialog) caseDialog.close();
  });

  window.addEventListener("hashchange", () => {
    loadSharedCardFromCurrentUrl();
  });
}

renderThemeButtons();
syncInputs();
attachEvents();
applyMode();
render(true);
loadSavedCardFromCurrentUrl();
if (getParamFromUrl("cardId")) {
  ensureLiffReady().catch((error) => console.warn("LIFF init preload failed", error));
}
