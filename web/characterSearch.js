import { api } from "../../scripts/api.js";

export async function characterSearch() {
    const moegirlSearchBtn = document.getElementById("moegirl-search-btn");
        const characterSearchInput = document.getElementById("character-search-input")
        const moegirlUrl = "https://moegirl.org"
        moegirlSearchBtn.addEventListener("click", () => {
            window.open(moegirlUrl + "/" + characterSearchInput.value, '_blank');
        });

        const searchSrcInput = document.getElementById('search-src-input');
        const chooseBtn = document.getElementById('choose-src-btn');
        let currentExcelPath = "";
        chooseBtn.onclick = async () => {
            const response = await fetch('/minitools/get_local_path');
            const data = await response.json();
            if (data.src) {
                currentExcelPath = data.src;
                searchSrcInput.value = currentExcelPath;
            }
        };
        const response = await fetch('/minitools/get_init_config');
        const data = await response.json();
        if (data.src) {
            currentExcelPath = data.src;
            searchSrcInput.value = currentExcelPath;
        }

        const characterSearchBtn = document.getElementById("character-search-btn");
        let isSearching = false;
        let currentRequestId = null;
        characterSearchBtn.addEventListener("click", async () => {
            if (isSearching) {
                await api.fetchApi("/minitools/cancel_search", {
                    method: "POST",
                    body: JSON.stringify({request_id: currentRequestId}),
                });
                isSearching = false
                return;
            }
            isSearching = true;
            characterSearchBtn.innerText = "取消";
            const src = searchSrcInput.value;
            const query = characterSearchInput.value;
            currentRequestId = crypto.randomUUID();
            const response = await api.fetchApi("/minitools/search_handler", {
                method: "POST",
                body: JSON.stringify({query: query, src: src, request_id: currentRequestId}),
            });
            const data = await response.json();
            const searchProgress = document.getElementById("search-progress");
            isSearching = false;
            if (data.length){
                searchProgress.textContent = "搜索完成, 共" + data.length + "条结果";
            } else {
                searchProgress.textContent = "输入关键词进行搜索";
            }
            characterSearchBtn.innerText = "搜索";
            console.log(data);
            if (data.error) {
                alert("Search error: " + data.error);
                return;
            }
            if (data.results) {
                renderResults(data.results);
            }
        });

        api.addEventListener("minitools_progress", ({ detail }) => {
            const progress = detail.value;
            const searchProgress = document.getElementById("search-progress");

            if (searchProgress) {
                if (progress < 100) {
                    searchProgress.textContent = "搜索进度" + progress + "%";
                }
            }
        });
}

function renderResults(results) {
    const container = document.getElementById("results-container");
    const popoverEl = document.getElementById("info-popover");
    container.innerHTML = "";

    results.forEach(data => {
        const itemEl = document.createElement("div");
        itemEl.className = "search-item";

        const labelEl = document.createElement("div");
        labelEl.className = "trigger-label";
        labelEl.innerText = data.trigger || "Unknown";
        labelEl.title = data.trigger;

        const iconEl = document.createElement("div");
        iconEl.className = "about-icon";
        iconEl.innerText = "i";
        let hideTimeout;
        iconEl.addEventListener("mouseenter", (e) => {
            popoverEl.classList.add("active");
            clearTimeout(hideTimeout);
            popoverEl.style.display = "block";
            popoverEl.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 0;">
                    <div style="color:#aaa; font-size: 11px;">角色信息</div>              
                    <div style="display: flex; gap: 10px;">
                        <span class="popover-icon btn-copy" id="copy-btn" title="复制提示词" style="cursor: pointer; font-size: 12px;">📋</span>
                        <span class="popover-icon btn-web" id="url-btn" title="链接" style="cursor: pointer; font-size: 12px;">🔗</span>
                    </div>
                </div>
                <div style="font-weight:bold;">${data.trigger || 'N/A'}</div>
                <hr style="border:0; border-top:1px solid #444; margin:8px 0;">
                <div style="color:#aaa;">Tags:</div>
                <div style="font-size:11px;">${data.core_tags || 'No tags available.'}</div>
                <hr style="border:0; border-top:1px solid #444; margin:8px 0;">
                <div style="display: flex; gap: 20px; align-items: flex-start;">
                    <div style="display: flex; flex-direction: column; gap: 2px;">
                        <div style="color:#aaa; font-size:11px;">样本数</div>
                        <div style="font-weight:bold; color:#fff; font-size:12px;">${data.count || 'NaN'}</div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 2px;">
                        <div style="color:#aaa; font-size:11px;">单人样本数</div>
                        <div style="font-weight:bold; color:#fff; font-size:12px;">${data.solo_count || '0'}</div>
                    </div>
                </div>
            `;
            const copyBtn = document.getElementById("copy-btn");
            const urlBtn = document.getElementById("url-btn");
            copyBtn.addEventListener("click", async () => {
                const text = data.trigger + ", " + data.core_tags;
                try {
                    await navigator.clipboard.writeText(text);
                    console.log("[MiniTools]Tags copied: " + text);
                    showToast("提示词已复制")
                } catch (err) {
                    console.error("[MiniTools]Error: " + err);
                    showToast("复制失败: " + err);
                }
            });
            urlBtn.addEventListener("click", () => {
                window.open(data.url, "_blank");
            })

            const rect = e.target.getBoundingClientRect();
            let leftPos = rect.right + 10;
            let topPos = rect.top + (rect.height / 2);
            popoverEl.style.left = `${leftPos}px`;
            popoverEl.style.top = `${topPos}px`;
            popoverEl.style.transform = "translateY(-50%)";
            if (leftPos + 240 > window.innerWidth) {
                popoverEl.style.left = `${rect.left - 250}px`;
                popoverEl.classList.add('popover-left');
            }
        });
        iconEl.addEventListener("mouseleave", () => {
            hideTimeout = setTimeout(() => {
                popoverEl.style.display = "none";
                popoverEl.classList.remove("active");
            }, 500);
        });
        popoverEl.addEventListener("mouseenter", () => {
            clearTimeout(hideTimeout);
        });
        popoverEl.addEventListener("mouseleave", () => {
            popoverEl.style.display = "none";
            popoverEl.classList.remove("active");
        });
        itemEl.appendChild(labelEl);
        itemEl.appendChild(iconEl);
        container.appendChild(itemEl);
    });
}

function showToast(message) {
    const toast = document.createElement("div");
    toast.innerText = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #353535;
        color: white;
        padding: 10px 20px;
        border-radius: 4px;
        border: 1px solid white;
        z-index: 10001;
        pointer-events: none;
        box-shadow: 0 2px 10px rgba(0,0,0,0.5);
        transition: opacity 0.3s;
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 300);
    }, 1500);
}