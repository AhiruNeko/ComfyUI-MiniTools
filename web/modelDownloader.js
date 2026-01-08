import { api } from "../../scripts/api.js";
import { showToast, LinkedList } from "./utils.js";

export async function modelDownloader(configData) {
    const presetSelections = document.getElementById("preset-selections");
    const downloadInfoLabel = document.getElementById("download-info-label");
    const downloadUrl = document.getElementById("download-url");
    const apiKeyInput = document.getElementById("api-key-input");
    const apiKeyEditBtn = document.getElementById("api-key-edit-btn");
    const apiKeyLabel = document.getElementById("api-key-label");
    const filenameLabel = document.getElementById("filename-label");
    const fileSizeLabel = document.getElementById("file-size-label");
    const civitaiInfo = document.getElementById("civitai-info");
    const modelNameLabel = document.getElementById("model-name-label");
    const modelVersionLabel = document.getElementById("model-version-label");
    const modelTypeLabel = document.getElementById("model-type-label");
    const baseModelLabel = document.getElementById("base-model-label");
    const reloadBtn = document.getElementById("reload-btn");
    const apiContainer = document.getElementById("api-container");
    const classifyContainer = document.getElementById('classify-container');
    const addClassifyBtn = document.getElementById("add-classify-btn");
    const clearClassifyBtn = document.getElementById("clear-classify-btn");
    const autoClassifyContainer = document.getElementById("autoClassifyContainer");

    const classificationsLinkedList = new LinkedList();

    if (configData.civitai_api_key) {
        apiKeyInput.value = configData.civitai_api_key;
    }

    function updatePreset() {
        const preset = presetSelections.value;
        try {
            loadInfo();
        } catch (e) {
        }
        checkUrl(downloadUrl.value);
        if (preset === "civitai") {
            civitaiInfo.style.display = "flex";
            apiKeyLabel.style.display = "flex";
            apiContainer.style.display = "flex";
            autoClassifyContainer.style.display = "flex";
            return;
        }
        civitaiInfo.style.display = "none";
        apiKeyLabel.style.display = "none";
        apiContainer.style.display = "none";
        autoClassifyContainer.style.display = "none";
    }

    function formatBytes(bytes, decimals = 2) {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    function updateInfo(data = {}) {
        const info = data.model_info || {};
        const format = (v) => (v === "" || v == null) ? "-" : v;
        filenameLabel.textContent = format(data.suggested_filename);
        fileSizeLabel.textContent = (data.size === null || data.size === undefined || data.size === "")
            ? "-"
            : formatBytes(data.size);
        modelNameLabel.textContent = format(info.name);
        modelVersionLabel.textContent = format(info.version);
        modelTypeLabel.textContent = format(info.type);
        baseModelLabel.textContent = format(info.base_model);
    }

    updatePreset()
    presetSelections.addEventListener("change", updatePreset);

    let lastUrl = downloadUrl.value;
    let urlInputTimer = null;
    downloadUrl.addEventListener("input", async () => {
        if (downloadUrl.value === lastUrl) return;
        clearTimeout(urlInputTimer);
        urlInputTimer = setTimeout(async () => {
            lastUrl = downloadUrl.value;
            await loadInfo();
        }, 500);
    });

    async function loadInfo() {
        const url = downloadUrl.value;
        if (!checkUrl(url)) {
            if (url !== "") downloadInfoLabel.textContent = "下载链接与预设不匹配";
            updateInfo();
            return;
        }

        if (presetSelections.value === "civitai" && apiKeyInput.value === "") {
            downloadInfoLabel.textContent = "缺少API Key";
            return;
        }

        downloadInfoLabel.textContent = "正在加载......";
        const response = await api.fetchApi("/minitools/get_download_info", {
            method: "POST",
            body: JSON.stringify({mode: presetSelections.value, url: url, civitaiApiKey: apiKeyInput.value}),
        });
        const data = await response.json();
        console.log(data);
        if (data.error) {
            downloadInfoLabel.textContent = "加载失败";
            showToast("Error: " + data.error, "red");
            return;
        }
        updateInfo(data);
        downloadInfoLabel.textContent = "下载信息";
    }

    function checkUrl(url) {
        let regex = /.*/;
        if (url !== "") {
            if (presetSelections.value === "civitai") {
                regex = /^https?:\/\/civitai\.com\/api\/download\/models\/(\d+)(\?.*)?$/;
            }
        } else {
            return false;
        }
        return url.match(regex);
    }

    apiKeyEditBtn.addEventListener("click", async () => {
       if (apiKeyInput.readOnly) {
            apiKeyInput.readOnly = false;
            apiKeyInput.type = "text";
            apiKeyEditBtn.innerText = "完成";
            apiKeyInput.focus();
       } else {
           apiKeyInput.readOnly = true;
           apiKeyInput.type = "password";
           apiKeyEditBtn.innerText = "编辑";
           await api.fetchApi("/minitools/save_civitai_api_config", {
                method: "POST",
                body: JSON.stringify({civitai_api_key: apiKeyInput.value}),
           });
           await loadInfo();
       }
    });

    reloadBtn.addEventListener("click", loadInfo);

    function addCategory(lastNode=null) {
        const item = document.createElement('div');
        item.className = "classify-item";
        item.innerHTML = `
            <label class="title-text">➥</label>
        `;

        const classifyInputBox = document.createElement("input");
        classifyInputBox.type = "text";
        classifyInputBox.placeholder = "输入分类";
        classifyInputBox.className = "classify-input-box";
        item.appendChild(classifyInputBox);
        classifyInputBox.addEventListener("focus", async () => {

        });
        classifyInputBox.addEventListener("blur", () => {

        });

        const addChild = document.createElement("div");
        addChild.className = "classify-btn";
        addChild.innerHTML = `+`;
        addChild.title = "添加分类";
        item.appendChild(addChild);
        addChild.addEventListener("click", () => {
            addCategory(item);
        });

        const removeCurrent = document.createElement("div");
        removeCurrent.className = "classify-btn";
        removeCurrent.innerHTML = `-`;
        removeCurrent.title = "移除分类";
        item.appendChild(removeCurrent);
        removeCurrent.addEventListener("click", () => {
            classificationsLinkedList.removeNode(item, (v) => v.remove());
        });

        const removeChildren = document.createElement("div");
        removeChildren.className = "classify-btn";
        removeChildren.innerHTML = `&times;`;
        removeChildren.title = "移除分类及其子类";
        item.appendChild(removeChildren);
        removeChildren.addEventListener("click", () => {
           classificationsLinkedList.deleteFrom(item, (v) => v.remove());
        });

        if (!lastNode){
            classifyContainer.appendChild(item);
            classificationsLinkedList.append(item);
            return;
        }
        const insertAfter = (referenceNode, newNode) => referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
        insertAfter(lastNode, item);
        classificationsLinkedList.insertAfter(lastNode, item);
    }

    addClassifyBtn.addEventListener("click", () => {
        addCategory();
    });

    clearClassifyBtn.addEventListener("click", () => {
        classificationsLinkedList.clear((v) => v.remove());
    });
}