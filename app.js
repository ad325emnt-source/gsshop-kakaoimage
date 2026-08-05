/**
 * Kakao Moment Ad Creative Info Extractor - Frontend App
 * Strictly implements Adver61258KakaoMomentApi specification from Readme.md
 * Handles CORS automatically via Proxy Fallback
 */

const API_ENDPOINT = "https://cuyr21hbxd.execute-api.ap-northeast-2.amazonaws.com/prod/61258/moment-creative-info";
const LOCAL_STORAGE_KEY = "kakao_moment_x_api_key";
const PROXY_MODE_KEY = "kakao_moment_proxy_mode";
const HISTORY_STORAGE_KEY = "kakao_moment_search_history";

// State
let currentApiKey = localStorage.getItem(LOCAL_STORAGE_KEY) || "";
let currentProxyMode = localStorage.getItem(PROXY_MODE_KEY) || "auto"; // 'auto' | 'corsproxy' | 'direct'
let searchHistory = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || "[]");
let currentNormalizedData = null;
let currentRawData = null;
let currentSearchMode = "single"; // 'single' | 'batch'
let batchResults = [];

// DOM Elements
const configPanel = document.getElementById("config-panel");
const toggleConfigBtn = document.getElementById("toggle-config-btn");
const closeConfigBtn = document.getElementById("close-config-btn");
const apiKeyInput = document.getElementById("api-key-input");
const saveApiKeyBtn = document.getElementById("save-api-key-btn");
const clearApiKeyBtn = document.getElementById("clear-api-key-btn");
const toggleKeyVisibilityBtn = document.getElementById("toggle-key-visibility");
const keyStatusMsg = document.getElementById("key-status-msg");
const proxyRadios = document.querySelectorAll("input[name='proxy-mode']");

const tabBtns = document.querySelectorAll(".tab-btn");
const singleSearchView = document.getElementById("single-search-view");
const batchSearchView = document.getElementById("batch-search-view");
const adGroupIdInput = document.getElementById("ad-group-id-input");
const fetchBtn = document.getElementById("fetch-btn");
const fetchSpinner = document.getElementById("fetch-spinner");
const batchIdsInput = document.getElementById("batch-ids-input");
const batchFetchBtn = document.getElementById("batch-fetch-btn");
const batchSpinner = document.getElementById("batch-spinner");

const alertBanner = document.getElementById("alert-banner");
const alertMessage = document.getElementById("alert-message");
const alertCloseBtn = document.getElementById("alert-close-btn");

const historySection = document.getElementById("history-section");
const historyChips = document.getElementById("history-chips");

const resultContainer = document.getElementById("result-container");
const resultCreativeTitle = document.getElementById("result-creative-title");
const adTypeBadge = document.getElementById("ad-type-badge");
const exportCsvBtn = document.getElementById("export-csv-btn");
const copyJsonBtn = document.getElementById("copy-json-btn");

const kpiCreativeName = document.getElementById("kpi-creative-name");
const kpiIds = document.getElementById("kpi-ids");
const kpiFormat = document.getElementById("kpi-format");
const kpiStatus = document.getElementById("kpi-status");

const rowPromoTitle = document.getElementById("row-promo-title");
const valPromoTitle = document.getElementById("val-promo-title");
const valDescription = document.getElementById("val-description");
const valMainLandingUrl = document.getElementById("val-main-landing-url");

const buttonsCard = document.getElementById("buttons-card");
const buttonsListContainer = document.getElementById("buttons-list-container");

const itemsCard = document.getElementById("items-card");
const itemsCountSpan = document.getElementById("items-count");
const itemsTableBody = document.getElementById("items-table-body");

const imagesCard = document.getElementById("images-card");
const imageGalleryContainer = document.getElementById("image-gallery-container");

const batchResultsCard = document.getElementById("batch-results-card");
const batchTableBody = document.getElementById("batch-table-body");
const exportBatchCsvBtn = document.getElementById("export-batch-csv-btn");

const rawJsonToggle = document.getElementById("raw-json-toggle");
const rawJsonContent = document.getElementById("raw-json-content");
const jsonTabBtns = document.querySelectorAll(".json-tab-btn");
const normalizedJsonView = document.getElementById("normalized-json-view");
const rawJsonView = document.getElementById("raw-json-view");

const imageModal = document.getElementById("image-modal");
const modalImgTarget = document.getElementById("modal-img-target");
const modalCaption = document.getElementById("modal-caption");

/* ==========================================================================
   1. Initialization & Event Listeners
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    initApiKeyUI();
    renderHistoryChips();
    setupEventListeners();
});

function initApiKeyUI() {
    if (currentApiKey) {
        apiKeyInput.value = currentApiKey;
        keyStatusMsg.className = "status-msg success";
        keyStatusMsg.textContent = "✓ API Key가 저장되어 있습니다.";
    } else {
        keyStatusMsg.className = "status-msg error";
        keyStatusMsg.textContent = "⚠️ API Key를 설정해야 API 조회가 가능합니다.";
        showConfigPanel(true);
    }

    // Set selected proxy radio
    proxyRadios.forEach(radio => {
        if (radio.value === currentProxyMode) {
            radio.checked = true;
        }
    });
}

function setupEventListeners() {
    // Config Panel
    toggleConfigBtn.addEventListener("click", () => showConfigPanel(configPanel.style.display === "none"));
    closeConfigBtn.addEventListener("click", () => showConfigPanel(false));
    
    saveApiKeyBtn.addEventListener("click", () => {
        const val = apiKeyInput.value.trim();
        if (!val) {
            keyStatusMsg.className = "status-msg error";
            keyStatusMsg.textContent = "API Key를 입력해주세요.";
            return;
        }
        currentApiKey = val;
        localStorage.setItem(LOCAL_STORAGE_KEY, val);
        
        // Save proxy radio selection
        const selectedRadio = document.querySelector("input[name='proxy-mode']:checked");
        if (selectedRadio) {
            currentProxyMode = selectedRadio.value;
            localStorage.setItem(PROXY_MODE_KEY, currentProxyMode);
        }

        keyStatusMsg.className = "status-msg success";
        keyStatusMsg.textContent = "✓ API Key 및 네트워크 설정이 저장되었습니다.";
        setTimeout(() => showConfigPanel(false), 1200);
    });

    clearApiKeyBtn.addEventListener("click", () => {
        currentApiKey = "";
        apiKeyInput.value = "";
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        keyStatusMsg.className = "status-msg error";
        keyStatusMsg.textContent = "API Key가 초기화되었습니다.";
    });

    toggleKeyVisibilityBtn.addEventListener("click", () => {
        const isPassword = apiKeyInput.type === "password";
        apiKeyInput.type = isPassword ? "text" : "password";
        toggleKeyVisibilityBtn.textContent = isPassword ? "🙈" : "👁️";
    });

    // Search Mode Tabs
    tabBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            tabBtns.forEach(b => b.classList.remove("active"));
            e.target.classList.add("active");
            currentSearchMode = e.target.dataset.mode;
            
            if (currentSearchMode === "single") {
                singleSearchView.style.display = "block";
                batchSearchView.style.display = "none";
                batchResultsCard.style.display = "none";
            } else {
                singleSearchView.style.display = "none";
                batchSearchView.style.display = "block";
            }
        });
    });

    // Sample ID buttons
    document.querySelectorAll(".sample-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const id = e.target.dataset.id;
            adGroupIdInput.value = id;
            handleSingleFetch(id);
        });
    });

    // Fetch Buttons & Enter key
    fetchBtn.addEventListener("click", () => {
        const id = adGroupIdInput.value.trim();
        if (id) handleSingleFetch(id);
        else showAlert("광고그룹 ID를 입력해주세요.");
    });

    adGroupIdInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            const id = adGroupIdInput.value.trim();
            if (id) handleSingleFetch(id);
        }
    });

    batchFetchBtn.addEventListener("click", handleBatchFetch);

    alertCloseBtn.addEventListener("click", hideAlert);

    // Export & Copy
    exportCsvBtn.addEventListener("click", exportSingleCsv);
    copyJsonBtn.addEventListener("click", copyNormalizedJson);
    exportBatchCsvBtn.addEventListener("click", exportBatchCsv);

    // Accordion for JSON
    rawJsonToggle.addEventListener("click", () => {
        rawJsonToggle.classList.toggle("active");
        const isOpen = rawJsonContent.style.display === "block";
        rawJsonContent.style.display = isOpen ? "none" : "block";
    });

    jsonTabBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            jsonTabBtns.forEach(b => b.classList.remove("active"));
            e.target.classList.add("active");
            const targetId = e.target.dataset.target;
            normalizedJsonView.style.display = targetId === "normalized-json-view" ? "block" : "none";
            rawJsonView.style.display = targetId === "raw-json-view" ? "block" : "none";
        });
    });

    // Global copy button delegator
    document.addEventListener("click", (e) => {
        if (e.target.classList.contains("copy-icon-btn")) {
            const targetId = e.target.dataset.copyTarget;
            const textToCopy = targetId ? document.getElementById(targetId)?.textContent : e.target.dataset.copyText;
            if (textToCopy && textToCopy !== "-") {
                navigator.clipboard.writeText(textToCopy).then(() => {
                    const orig = e.target.textContent;
                    e.target.textContent = "✓";
                    setTimeout(() => e.target.textContent = orig, 1500);
                });
            }
        }
    });

    // Modal Close
    document.querySelector(".modal-close")?.addEventListener("click", () => {
        imageModal.style.display = "none";
    });
    imageModal?.addEventListener("click", (e) => {
        if (e.target === imageModal) imageModal.style.display = "none";
    });
}

function showConfigPanel(show) {
    configPanel.style.display = show ? "block" : "none";
}

function showAlert(message, type = "error") {
    alertMessage.innerHTML = message;
    alertBanner.className = `alert-banner ${type}`;
    document.getElementById("alert-icon").textContent = type === "error" ? "⚠️" : "ℹ️";
    alertBanner.style.display = "flex";
}

function hideAlert() {
    alertBanner.style.display = "none";
}

/* ==========================================================================
   2. API & Data Normalization Logic (Strict Spec from Readme.md)
   ========================================================================== */

function detectAdType(adGroupId) {
    if (adGroupId.startsWith("msg-ad")) {
        return "new_message_ad";
    }
    if (/^[0-9]+$/.test(adGroupId)) {
        return "legacy_creative_ad";
    }
    return "unknown";
}

function unwrapResponse(data) {
    if (data && typeof data === "object" && "body" in data) {
        const body = data.body;
        if (typeof body === "string") {
            try {
                return JSON.parse(body);
            } catch (err) {
                return body;
            }
        }
        return body;
    }
    return data;
}

function normalizeUrl(url) {
    if (!url) return null;
    if (typeof url === "string" && url.startsWith("//")) {
        return "https:" + url;
    }
    return url;
}

async function fetchCreativeInfoFromApi(adGroupId, apiKey) {
    const targetUrl = `${API_ENDPOINT}?id=${encodeURIComponent(adGroupId)}`;
    const headers = { "x-api-key": apiKey };

    const isLocalServer = window.location.origin && (window.location.origin.includes("localhost") || window.location.origin.includes("127.0.0.1"));

    let urlsToTry = [];
    if (currentProxyMode === "corsproxy") {
        urlsToTry.push(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`);
    } else if (isLocalServer) {
        urlsToTry.push(`/api/info?id=${encodeURIComponent(adGroupId)}`);
        urlsToTry.push(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`);
        urlsToTry.push(targetUrl);
    } else {
        urlsToTry.push(targetUrl);
        urlsToTry.push(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`);
    }

    let lastError = null;

    for (let i = 0; i < urlsToTry.length; i++) {
        const reqUrl = urlsToTry[i];
        try {
            const response = await fetch(reqUrl, {
                method: "GET",
                headers: headers
            });

            if (response.ok) {
                const rawJson = await response.json();
                return unwrapResponse(rawJson);
            }

            let errText = "";
            try {
                const errJson = await response.json();
                errText = errJson.message || errJson.error || JSON.stringify(errJson);
            } catch (e) {
                errText = await response.text();
            }

            if (response.status === 403) {
                if (reqUrl.startsWith("/api/info") || reqUrl.includes("corsproxy.io")) {
                    throw new Error("API Key가 없거나 잘못되었습니다 (403 Forbidden). [API Key 설정] 버튼에서 올바른 x-api-key를 입력해 주세요.");
                }
                lastError = new Error(`403 Forbidden: ${errText}`);
                continue;
            }

            throw new Error(`API 호출 에러 (Status: ${response.status}): ${errText}`);

        } catch (err) {
            lastError = err;
            if (err.message.includes("API Key가 없거나 잘못되었습니다")) {
                throw err;
            }
            console.warn(`Attempt with ${reqUrl} failed:`, err);
        }
    }

    throw lastError || new Error("API 호출에 실패했습니다.");
}

function parseNewMessageAd(data) {
    const items = data.items || [];
    const buttons = data.buttons || [];

    return {
        ad_type: "new_message_ad",
        message_ad_id: data.messageAdId || null,
        creative_name: data.name || null,
        message_type: data.type || null,
        description: data.description || null,
        landing_urls: items
            .map(item => item.landing?.mobileLandingUrl)
            .filter(Boolean),
        button_urls: buttons
            .map(button => button.mobileLandingUrl)
            .filter(Boolean),
        buttons: buttons.map(button => ({
            title: button.title || null,
            mobile_landing_url: button.mobileLandingUrl || null
        })),
        image_urls: items
            .map(item => normalizeUrl(item.imageUrl))
            .filter(Boolean)
    };
}

function parseLegacyCreativeAd(data) {
    const message = data.messageElement || {};
    const buttonGroups = message.buttonAssetGroups || [];
    const itemGroups = message.itemAssetGroups || [];

    const directImageUrl = normalizeUrl(message.image?.url || message.imageUrl || data.image?.url || data.imageUrl);

    const items = itemGroups.map(item => ({
        ordering: item.ordering ?? null,
        title: item.title || null,
        landing_url: item.mobileLandingUrl || null,
        currency: item.priceCurrencyCode || null,
        price_amount: item.priceAmount || null,
        discounted_price_amount: item.discountedPriceAmount || null,
        image_url: normalizeUrl(item.image?.url) || null
    }));

    const imageUrls = [];
    if (directImageUrl) imageUrls.push(directImageUrl);
    items.forEach(i => {
        if (i.image_url && !imageUrls.includes(i.image_url)) {
            imageUrls.push(i.image_url);
        }
    });

    return {
        ad_type: "legacy_creative_ad",
        creative_id: data.creativeId || null,
        ad_group_id: data.adGroupId || null,
        creative_name: data.name || message.name || null,
        format: data.format || message.creativeFormat || null,
        status_description: data.statusDescription || null,
        main_landing_url: message.introMobileLandingUrl || null,
        fallback_landing_url: message.mobileLandingUrl || null,
        promotion_title: message.title || null,
        description: message.description || null,
        direct_image_url: directImageUrl,
        image_urls: imageUrls,
        button_urls: buttonGroups
            .map(button => button.mobileLandingUrl)
            .filter(Boolean),
        items: items
    };
}

function normalizeCreativeData(adGroupId, rawData) {
    const adType = detectAdType(adGroupId);
    if (adType === "new_message_ad") {
        return parseNewMessageAd(rawData);
    } else if (adType === "legacy_creative_ad") {
        return parseLegacyCreativeAd(rawData);
    } else {
        if (rawData.messageAdId || adGroupId.startsWith("msg-ad")) {
            return parseNewMessageAd(rawData);
        }
        return parseLegacyCreativeAd(rawData);
    }
}

/* ==========================================================================
   3. Single ID Fetch Handler
   ========================================================================== */

async function handleSingleFetch(adGroupId) {
    hideAlert();
    if (!currentApiKey) {
        showAlert("x-api-key가 설정되지 않았습니다. 상단 [API Key 설정]에서 키를 입력해 주세요.");
        showConfigPanel(true);
        return;
    }

    setLoading(true);
    try {
        const rawData = await fetchCreativeInfoFromApi(adGroupId, currentApiKey);
        currentRawData = rawData;
        
        const normalized = normalizeCreativeData(adGroupId, rawData);
        currentNormalizedData = normalized;

        renderSingleResult(normalized, rawData);
        saveSearchHistory(adGroupId);
        
        resultContainer.style.display = "block";
        batchResultsCard.style.display = "none";
        
        resultContainer.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
        showAlert(err.message || "데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
        setLoading(false);
    }
}

function setLoading(loading) {
    if (loading) {
        fetchSpinner.style.display = "inline-block";
        fetchBtn.disabled = true;
    } else {
        fetchSpinner.style.display = "none";
        fetchBtn.disabled = false;
    }
}

/* ==========================================================================
   4. Rendering Logic
   ========================================================================== */

function renderSingleResult(data, rawData) {
    const isNewMessage = data.ad_type === "new_message_ad";

    // Badge
    adTypeBadge.className = isNewMessage ? "badge badge-new-ad" : "badge badge-legacy-ad";
    adTypeBadge.textContent = isNewMessage ? "신규 메시지 광고 (msg-ad)" : "기존 소재 광고 (Legacy)";

    // Title
    resultCreativeTitle.textContent = data.creative_name || "소재 이름 없음";

    // KPI Cards
    kpiCreativeName.textContent = data.creative_name || "응답에서 확인 불가";
    
    if (isNewMessage) {
        kpiIds.textContent = `Message Ad ID: ${data.message_ad_id || "확인 불가"}`;
        kpiFormat.textContent = data.message_type || "응답에서 확인 불가";
        kpiStatus.textContent = "정상 조회";
    } else {
        kpiIds.textContent = `소재ID: ${data.creative_id || "-"} / 광고그룹ID: ${data.ad_group_id || "-"}`;
        kpiFormat.textContent = data.format || "응답에서 확인 불가";
        kpiStatus.textContent = data.status_description || "응답에서 확인 불가";
    }

    // Detail Grid
    if (isNewMessage) {
        rowPromoTitle.style.display = "none";
        valDescription.textContent = data.description || "응답에서 확인 불가";
        
        const mainUrl = data.landing_urls[0] || "응답에서 확인 불가";
        setupUrlField(valMainLandingUrl, mainUrl);
    } else {
        rowPromoTitle.style.display = "flex";
        valPromoTitle.textContent = data.promotion_title || "응답에서 확인 불가";
        valDescription.textContent = data.description || "응답에서 확인 불가";
        
        const mainUrl = data.main_landing_url || data.fallback_landing_url || "응답에서 확인 불가";
        setupUrlField(valMainLandingUrl, mainUrl);
    }

    // Buttons Render
    buttonsListContainer.innerHTML = "";
    const buttonsToRender = isNewMessage 
        ? data.buttons 
        : (data.button_urls || []).map((url, idx) => ({ title: `버튼 ${idx + 1}`, mobile_landing_url: url }));

    if (buttonsToRender && buttonsToRender.length > 0) {
        buttonsCard.style.display = "block";
        buttonsToRender.forEach((btn, idx) => {
            const btnEl = document.createElement("div");
            btnEl.className = "btn-item-card";
            const urlVal = btn.mobile_landing_url || "-";
            btnEl.innerHTML = `
                <span class="btn-item-title">${escapeHtml(btn.title || `버튼 ${idx + 1}`)}</span>
                <div class="url-wrapper flex-grow">
                    <a href="${urlVal}" target="_blank" class="url-link">${escapeHtml(urlVal)}</a>
                </div>
                <button class="copy-icon-btn" data-copy-text="${escapeHtml(urlVal)}" title="URL 복사">📋 복사</button>
            `;
            buttonsListContainer.appendChild(btnEl);
        });
    } else {
        buttonsCard.style.display = "none";
    }

    // Items Render (Carousel / Card List)
    itemsTableBody.innerHTML = "";
    const items = data.items || [];
    if (items.length > 0) {
        itemsCard.style.display = "block";
        itemsCountSpan.textContent = items.length;
        
        items.forEach(item => {
            const tr = document.createElement("tr");
            const imgHtml = item.image_url 
                ? `<img src="${item.image_url}" class="table-thumb" onclick="openImageModal('${item.image_url}', '${escapeHtml(item.title || '')}')">` 
                : `<span class="text-muted">-</span>`;
            
            const origPrice = item.price_amount ? `${Number(item.price_amount).toLocaleString()} ${item.currency || ''}` : "-";
            const discPrice = item.discounted_price_amount ? `${Number(item.discounted_price_amount).toLocaleString()} ${item.currency || ''}` : "-";
            
            tr.innerHTML = `
                <td><strong>${item.ordering ?? "-"}</strong></td>
                <td>${imgHtml}</td>
                <td><strong>${escapeHtml(item.title || "타이틀 없음")}</strong></td>
                <td><span class="price-original">${origPrice}</span></td>
                <td><span class="price-discount">${discPrice}</span></td>
                <td>
                    <div class="url-wrapper">
                        <a href="${item.landing_url || '#'}" target="_blank" class="url-link">${escapeHtml(item.landing_url || '-')}</a>
                        <button class="copy-icon-btn" data-copy-text="${escapeHtml(item.landing_url || '')}">📋</button>
                    </div>
                </td>
            `;
            itemsTableBody.appendChild(tr);
        });
    } else {
        itemsCard.style.display = "none";
    }

    // Image Gallery Render
    imageGalleryContainer.innerHTML = "";
    const images = isNewMessage 
        ? (data.image_urls || []) 
        : ((data.image_urls && data.image_urls.length > 0) ? data.image_urls : items.map(i => i.image_url).filter(Boolean));
    if (images && images.length > 0) {
        imagesCard.style.display = "block";
        images.forEach((imgUrl, idx) => {
            const card = document.createElement("div");
            card.className = "gallery-card";
            card.innerHTML = `
                <div class="gallery-img-wrapper" onclick="openImageModal('${imgUrl}', '이미지 #${idx + 1}')">
                    <img src="${imgUrl}" class="gallery-img" alt="Ad Image ${idx + 1}" loading="lazy">
                </div>
                <div class="gallery-info">
                    <span>이미지 #${idx + 1}</span>
                    <button class="copy-icon-btn" data-copy-text="${imgUrl}">📋 복사</button>
                </div>
            `;
            imageGalleryContainer.appendChild(card);
        });
    } else {
        imagesCard.style.display = "none";
    }

    // Render JSON code boxes
    normalizedJsonView.textContent = JSON.stringify(data, null, 2);
    rawJsonView.textContent = JSON.stringify(rawData, null, 2);
}

function setupUrlField(anchorEl, url) {
    if (url && url !== "응답에서 확인 불가") {
        anchorEl.href = url;
        anchorEl.textContent = url;
        anchorEl.classList.remove("text-muted");
    } else {
        anchorEl.removeAttribute("href");
        anchorEl.textContent = "응답에서 확인 불가";
        anchorEl.classList.add("text-muted");
    }
}

/* ==========================================================================
   5. Batch Fetch & Handling
   ========================================================================== */

async function handleBatchFetch() {
    hideAlert();
    if (!currentApiKey) {
        showAlert("x-api-key가 설정되지 않았습니다. 상단 [API Key 설정]에서 키를 입력해 주세요.");
        showConfigPanel(true);
        return;
    }

    const rawInput = batchIdsInput.value.trim();
    if (!rawInput) {
        showAlert("대량 조회할 광고그룹 ID들을 입력해 주세요.");
        return;
    }

    const idList = rawInput
        .split(/[\n,]+/)
        .map(id => id.trim())
        .filter(Boolean);

    if (idList.length === 0) {
        showAlert("올바른 광고그룹 ID가 발견되지 않았습니다.");
        return;
    }

    batchSpinner.style.display = "inline-block";
    batchFetchBtn.disabled = true;
    batchResults = [];
    batchTableBody.innerHTML = "";

    try {
        for (const id of idList) {
            try {
                const rawData = await fetchCreativeInfoFromApi(id, currentApiKey);
                const normalized = normalizeCreativeData(id, rawData);
                batchResults.push({ input_id: id, success: true, data: normalized, raw: rawData });
            } catch (err) {
                batchResults.push({ input_id: id, success: false, error: err.message });
            }
        }

        renderBatchResults(batchResults);
        resultContainer.style.display = "block";
        batchResultsCard.style.display = "block";
        batchResultsCard.scrollIntoView({ behavior: "smooth" });

    } finally {
        batchSpinner.style.display = "none";
        batchFetchBtn.disabled = false;
    }
}

function renderBatchResults(results) {
    batchTableBody.innerHTML = "";
    
    results.forEach((res, index) => {
        const tr = document.createElement("tr");
        if (res.success) {
            const d = res.data;
            const isNew = d.ad_type === "new_message_ad";
            const mainUrl = isNew 
                ? (d.landing_urls[0] || "-") 
                : (d.main_landing_url || d.fallback_landing_url || "-");
            const itemCount = isNew ? (d.image_urls.length) : (d.items ? d.items.length : 0);

            tr.innerHTML = `
                <td><code>${escapeHtml(res.input_id)}</code></td>
                <td><span class="badge ${isNew ? 'badge-new-ad' : 'badge-legacy-ad'}">${isNew ? '신규메시지' : '기존소재'}</span></td>
                <td><strong>${escapeHtml(d.creative_name || '-')}</strong></td>
                <td>${escapeHtml(d.promotion_title || d.description || '-')}</td>
                <td><a href="${mainUrl}" target="_blank" class="url-link">${escapeHtml(mainUrl)}</a></td>
                <td>${itemCount}개</td>
                <td><button class="btn btn-secondary btn-sm" onclick="viewBatchDetail(${index})">상세보기</button></td>
            `;
        } else {
            tr.innerHTML = `
                <td><code>${escapeHtml(res.input_id)}</code></td>
                <td><span class="badge" style="background: rgba(244,63,94,0.2); color:#f43f5e;">오류</span></td>
                <td colspan="4" class="text-danger">${escapeHtml(res.error)}</td>
                <td>-</td>
            `;
        }
        batchTableBody.appendChild(tr);
    });
}

function viewBatchDetail(index) {
    const res = batchResults[index];
    if (res && res.success) {
        currentNormalizedData = res.data;
        currentRawData = res.raw;
        renderSingleResult(res.data, res.raw);
        document.querySelector(".kpi-grid").scrollIntoView({ behavior: "smooth" });
    }
}

/* ==========================================================================
   6. Export CSV & Utilities
   ========================================================================== */

function exportSingleCsv() {
    if (!currentNormalizedData) return;
    const data = currentNormalizedData;
    const isNew = data.ad_type === "new_message_ad";

    let rows = [];

    if (isNew) {
        rows.push(["광고유형", "신규 메시지 광고 (msg-ad)"]);
        rows.push(["메시지 광고 ID", data.message_ad_id || ""]);
        rows.push(["광고 소재 이름", data.creative_name || ""]);
        rows.push(["메시지 유형", data.message_type || ""]);
        rows.push(["홍보 문구", data.description || ""]);
        rows.push(["랜딩 URL 목록", (data.landing_urls || []).join(" | ")]);
        rows.push(["버튼 URL 목록", (data.button_urls || []).join(" | ")]);
        rows.push(["이미지 URL 목록", (data.image_urls || []).join(" | ")]);
    } else {
        rows.push(["광고유형", "기존 소재 광고 (Legacy)"]);
        rows.push(["소재 ID", data.creative_id || ""]);
        rows.push(["광고그룹 ID", data.ad_group_id || ""]);
        rows.push(["광고 소재 이름", data.creative_name || ""]);
        rows.push(["소재 포맷", data.format || ""]);
        rows.push(["소재 상태", data.status_description || ""]);
        rows.push(["대표 랜딩 URL", data.main_landing_url || ""]);
        rows.push(["대체 랜딩 URL", data.fallback_landing_url || ""]);
        rows.push(["홍보 타이틀", data.promotion_title || ""]);
        rows.push(["홍보 문구", data.description || ""]);
        rows.push(["버튼 URL 목록", (data.button_urls || []).join(" | ")]);
        
        rows.push([]);
        rows.push(["--- 상품/카드 상세 목록 ---"]);
        rows.push(["순서", "상품 타이틀", "판매가", "할인가", "통화", "카드 랜딩 URL", "카드 이미지 URL"]);
        
        (data.items || []).forEach(item => {
            rows.push([
                item.ordering ?? "",
                item.title || "",
                item.price_amount || "",
                item.discounted_price_amount || "",
                item.currency || "",
                item.landing_url || "",
                item.image_url || ""
            ]);
        });
    }

    downloadCsv(`kakao_moment_creative_${data.creative_name || 'info'}.csv`, rows);
}

function exportBatchCsv() {
    if (!batchResults || batchResults.length === 0) return;

    let rows = [
        ["입력 ID", "성공여부", "광고유형", "소재ID/메시지ID", "소재이름", "홍보타이틀", "홍보문구", "대표랜딩URL", "상품수", "에러메시지"]
    ];

    batchResults.forEach(res => {
        if (res.success) {
            const d = res.data;
            const isNew = d.ad_type === "new_message_ad";
            rows.push([
                res.input_id,
                "성공",
                isNew ? "신규 메시지 광고" : "기존 소재 광고",
                isNew ? d.message_ad_id : d.creative_id,
                d.creative_name || "",
                d.promotion_title || "",
                d.description || "",
                isNew ? (d.landing_urls[0] || "") : (d.main_landing_url || d.fallback_landing_url || ""),
                isNew ? d.image_urls.length : (d.items ? d.items.length : 0),
                ""
            ]);
        } else {
            rows.push([res.input_id, "실패", "", "", "", "", "", "", "", res.error]);
        }
    });

    downloadCsv("kakao_moment_batch_results.csv", rows);
}

function downloadCsv(filename, rows) {
    const csvContent = "\uFEFF" + rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

function copyNormalizedJson() {
    if (!currentNormalizedData) return;
    navigator.clipboard.writeText(JSON.stringify(currentNormalizedData, null, 2)).then(() => {
        const origText = copyJsonBtn.textContent;
        copyJsonBtn.textContent = "✓ 복사 완료!";
        setTimeout(() => copyJsonBtn.textContent = origText, 1500);
    });
}

function openImageModal(imgUrl, caption) {
    modalImgTarget.src = imgUrl;
    modalCaption.textContent = caption || "";
    imageModal.style.display = "flex";
}

/* ==========================================================================
   7. History & Helper Utilities
   ========================================================================== */

function saveSearchHistory(id) {
    searchHistory = searchHistory.filter(item => item !== id);
    searchHistory.unshift(id);
    if (searchHistory.length > 8) searchHistory.pop();
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(searchHistory));
    renderHistoryChips();
}

function renderHistoryChips() {
    if (searchHistory.length === 0) {
        historySection.style.display = "none";
        return;
    }
    historySection.style.display = "flex";
    historyChips.innerHTML = "";
    searchHistory.forEach(id => {
        const chip = document.createElement("button");
        chip.className = "chip";
        chip.textContent = id;
        chip.addEventListener("click", () => {
            adGroupIdInput.value = id;
            handleSingleFetch(id);
        });
        historyChips.appendChild(chip);
    });
}

function escapeHtml(str) {
    if (typeof str !== "string") return str;
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
