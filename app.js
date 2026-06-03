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

const PUBLIC_SITE_URL = "https://linzhiyi935-beep.github.io/chiayi-sme-line-card/";

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

function hasSharedCard() {
  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return params.has("card") || hashParams.has("card");
}

function loadState() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("fresh") === "1" && !params.has("card")) {
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
  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const encoded = params.get("card") || hashParams.get("card");
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
  localStorage.setItem("lineCardState", JSON.stringify(state));
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
  const isLocal = ["localhost", "127.0.0.1", ""].includes(window.location.hostname);
  if (isLocal || window.location.protocol === "file:") return PUBLIC_SITE_URL;
  return `${window.location.origin}${window.location.pathname}`;
}

function makePublicCardUrl() {
  const { portable, omittedImages } = getPortableState();
  const encoded = encodeBase64Url(JSON.stringify(portable));
  const baseUrl = getShareBaseUrl();
  const url = `${baseUrl}#card=${encoded}`;
  return { url, omittedImages };
}

function makeLineShareUrl(url) {
  const message = `${state.displayName || "我的 LINE 數位名片"}\n${url}`;
  return `line://msg/text/${encodeURIComponent(message)}`;
}

function preparePublicShare() {
  const { url, omittedImages } = makePublicCardUrl();
  state.publicCardUrl = url;
  syncInputs();
  persist();
  return { url, omittedImages };
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
    state.avatar = await fileToDataUrl(file);
    render(false);
    persist();
  });

  document.querySelector("#coverUpload").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    state.cover = await fileToDataUrl(file);
    render(false);
    persist();
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
    state.cases[index].image = await fileToDataUrl(file);
    render(false);
    persist();
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

  document.querySelector("#lineShareBtn").addEventListener("pointerdown", () => {
    const { url } = preparePublicShare();
    document.querySelector("#lineShareBtn").href = makeLineShareUrl(url);
  });

  document.querySelector("#lineShareBtn").addEventListener("click", async () => {
    const { url, omittedImages } = preparePublicShare();
    document.querySelector("#lineShareBtn").href = makeLineShareUrl(url);
    copyText(url);
    showToast(`正在開啟 LINE App，公開連結也已複製${omittedImages ? "，分享連結不包含上傳圖片" : ""}`);
  });

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
