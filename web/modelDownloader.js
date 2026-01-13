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
    const classifyRecommendations = document.getElementById("classify-recommendations");
    const savePathInput = document.getElementById("save-path-input");
    const chooseSavePathBtn = document.getElementById("choose-save-path-btn");
    const autoClassifyInput = document.getElementById("auto-classify-input");
    const autoClassifyUpdateBtn = document.getElementById("auto-classify-update-btn");

    const classificationsLinkedList = new LinkedList();

    let inputBox = null;
    let recommendationsDisplay = false;
    let recommendationClicked = false;
    let classifyChangeTimeout = null;
    let savePathInputTimeout = null;
    let downloadData = null;

    const modelPathResponse = await fetch("/minitools/get_model_path");
    const modelPathData = await modelPathResponse.json();
    const modelPath = modelPathData.model_path;
    let preInputPath = modelPath;

    savePathInput.value = modelPath;
    setTimeout(() => {
        savePathInput.scrollLeft = savePathInput.scrollWidth;
    }, 0);

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
            if (url !== "") {
                downloadInfoLabel.textContent = "下载链接与预设不匹配";
            } else {
                downloadInfoLabel.textContent = "下载信息";
            }
            updateInfo();
            return;
        } else {
            downloadInfoLabel.textContent = "下载信息";
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
        downloadData = data;

        const info = data.model_info || {};
        if (presetSelections.value === "civitai" && autoClassifyInput.checked) loadAutoClassify(info.type, info.base_model);

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
            apiKeyInput.setSelectionRange(0, apiKeyInput.value.length);
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

    function updateSavePath() {
        const itemList = classificationsLinkedList.toList(null, null);
        const pathList = itemList.map(div => {
            const input = div.querySelector('input');
            return input ? input.value : "";
        });
        savePathInput.value = [modelPath, ...pathList].join("\\");
        setTimeout(() => {
            savePathInput.scrollLeft = savePathInput.scrollWidth;
        }, 0);
        preInputPath = savePathInput.value;
    }

    function addCategory(node=null, defaultValue="", arg="after") {
        const item = document.createElement('div');
        item.className = "classify-item";

        const upBtn = document.createElement("div");
        upBtn.className = "classify-btn";
        upBtn.innerHTML = `↑`;
        upBtn.title = "上移";
        item.appendChild(upBtn);
        upBtn.addEventListener("click", () => {
            const preItem = classificationsLinkedList.up(item);
            if (preItem) item.parentNode.insertBefore(item, preItem);
            updateSavePath();
        });

        const downBtn = document.createElement("div");
        downBtn.className = "classify-btn";
        downBtn.innerHTML = `↓`;
        downBtn.title = "下移";
        item.appendChild(downBtn);
        downBtn.addEventListener("click", () => {
            const nextItem = classificationsLinkedList.down(item);
            if (nextItem) item.parentNode.insertBefore(nextItem, item);
            updateSavePath();
        });

        const classifyInputBox = document.createElement("input");
        classifyInputBox.type = "text";
        classifyInputBox.placeholder = "输入分类";
        classifyInputBox.className = "classify-input-box";
        if (defaultValue) classifyInputBox.value = defaultValue;
        item.appendChild(classifyInputBox);
        classifyInputBox.addEventListener("click", async () => {
            if (recommendationsDisplay && inputBox === classifyInputBox) {
                inputBox = classifyInputBox;
                classifyRecommendations.style.display = "none";
                classifyRecommendations.innerHTML = "";
                recommendationsDisplay = false;
                return;
            }
            inputBox = classifyInputBox;
            const itemList = classificationsLinkedList.toList(null, item);
            const pathList = itemList.slice(0, -1).map(div => {
                const input = div.querySelector('input');
                return input ? input.value : "";
            });
            const response = await api.fetchApi("/minitools/get_classifications", {
                method: "POST",
                body: JSON.stringify({path: pathList}),
            });
            const data = await response.json();
            let recommendations = [];
            if (data.folders) recommendations = data.folders;
            if (recommendations.length === 0) return;

            recommendationsDisplay = true;
            const rect = classifyInputBox.getBoundingClientRect();
            classifyRecommendations.style.left = `${rect.left}px`;
            classifyRecommendations.style.top = `${rect.bottom + window.scrollY}px`;
            classifyRecommendations.style.display = "flex";
            recommendations.forEach(data => {
                const recommendation = document.createElement("div");
                recommendation.className = "recommendation";
                recommendation.innerHTML = `<label class="title-text">${data}</label>`;
                recommendation.addEventListener("click", () => {
                    setTimeout(() => {
                        recommendationClicked = true
                        inputBox.value = data;
                        updateSavePath();
                        classifyRecommendations.style.display = "none";
                        classifyRecommendations.innerHTML = "";
                    }, 100);
                    recommendationsDisplay = false;
                });
                classifyRecommendations.appendChild(recommendation);
            });
        });
        classifyInputBox.addEventListener("input", () => {
            clearTimeout(classifyChangeTimeout);
            classifyChangeTimeout = setTimeout(() => {
                updateSavePath();
            }, 500);
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
            updateSavePath();
        });

        const removeChildren = document.createElement("div");
        removeChildren.className = "classify-btn";
        removeChildren.innerHTML = `&times;`;
        removeChildren.title = "移除分类及其子类";
        item.appendChild(removeChildren);
        removeChildren.addEventListener("click", () => {
           classificationsLinkedList.deleteFrom(item, (v) => v.remove());
           updateSavePath();
        });

        if (!node){
            classifyContainer.appendChild(item);
            classificationsLinkedList.append(item);
            return;
        }
        if (arg === "after") {
            const insertAfter = (referenceNode, newNode) => referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
            insertAfter(node, item);
            classificationsLinkedList.insertAfter(node, item);
            return;
        }
        if (arg === "before") {
            classifyContainer.insertBefore(item, node);
            classificationsLinkedList.insertBefore(node, item);
        }
    }

    document.addEventListener("click", (event) => {
        if (inputBox === null) return;
        const clickInInputBox = inputBox.contains(event.target);
        const clickInRecommendations = classifyRecommendations.contains(event.target);
        if (!clickInInputBox && !clickInRecommendations) {
            classifyRecommendations.style.display = "none";
            classifyRecommendations.innerHTML = "";
            recommendationsDisplay = false;
        }
    });

    addClassifyBtn.addEventListener("click", () => {
        addCategory();
    });

    clearClassifyBtn.addEventListener("click", () => {
        classificationsLinkedList.clear((v) => v.remove());
        updateSavePath();
    });

    savePathInput.addEventListener("input", () => {
        if (!savePathInput.value.startsWith(modelPath)) {
            savePathInput.value = preInputPath;
            return;
        }
        clearTimeout(savePathInputTimeout);
        savePathInputTimeout = setTimeout(() => {
            let path = savePathInput.value.replace(modelPath, "");
            const pathList = path.split("\\");
            classificationsLinkedList.clear((v) => v.remove());
            pathList.forEach(data => {
                if (data) addCategory(null, data);
            });
        }, 500);
        preInputPath = savePathInput.value;
    });

    savePathInput.addEventListener("blur", () => {
        setTimeout(() => {
            savePathInput.scrollLeft = savePathInput.scrollWidth;
        }, 0);
    });

    chooseSavePathBtn.addEventListener("click", async () => {
        const response = await api.fetchApi("/minitools/choose_save_path", {
            method: "POST",
            body: JSON.stringify({initialPath: savePathInput.value})
        });
        const data = await response.json();
        if (data.save_path) savePathInput.value = data.save_path.replaceAll("/", "\\");

        if (!savePathInput.value.startsWith(modelPath)) {
            savePathInput.value = preInputPath;
            return;
        }

        let path = savePathInput.value.replace(modelPath, "");
        const pathList = path.split("\\");
        classificationsLinkedList.clear((v) => v.remove());
        pathList.forEach(data => {
            if (data) addCategory(null, data);
        });
        preInputPath = savePathInput.value;

        setTimeout(() => {
            savePathInput.scrollLeft = savePathInput.scrollWidth;
        }, 0);
    });

    function mapCivitaiToComfy(civitaiType) {
        const TYPE_MAP = {
            "checkpoint": "checkpoints",
            "lora": "loras",
            "locon": "loras",
            "lycoris": "loras",
            "textualinversion": "embeddings",
            "controlnet": "controlnet",
            "vae": "vae",
            "hypernetwork": "hypernetworks",
            "upscaler": "upscale_models",
            "motionmodule": "animatediff_models",
            "workflow": "configs"
        };
        const input = String(civitaiType || "").trim().toLowerCase();
        return TYPE_MAP[input] || "others";
    }

    function loadAutoClassify(type, baseModel) {
        const comfyType = mapCivitaiToComfy(type);
        let firstNode = null;
        if (!classificationsLinkedList.isEmpty()) firstNode = classificationsLinkedList.head.value;
        addCategory(firstNode, comfyType,  "before");
        addCategory(firstNode, baseModel, "before");
        updateSavePath();
    }

    autoClassifyUpdateBtn.addEventListener("click", () => {
        if (!downloadData) return;
        const info = downloadData.model_info || {};
        if (autoClassifyInput.checked) loadAutoClassify(info.type, info.base_model);
    });

    autoClassifyInput.addEventListener("change", () => {
        if (autoClassifyInput.checked) {
            autoClassifyUpdateBtn.classList.remove("disabled");
        } else {
            autoClassifyUpdateBtn.classList.add("disabled");
        }
    });
}