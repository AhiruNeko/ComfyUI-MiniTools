export async function modelDownloader(configData) {
    const presetSelections = document.getElementById("preset-selections");
    const infoContainer = document.getElementById("info-container");

    function updateInfo() {
        const preset = presetSelections.value;
        if (preset === "civitai") {
            infoContainer.innerHTML += `
                <label class="title-text">模型名称</label>
                <label id="model-name-label" class="main-text">-</label>
                <label class="title-text">模型版本</label>
                <label id="model-version-label" class="main-text">-</label>
                <label class="title-text">模型类型</label>
                <label id="model-type-label" class="main-text">-</label>
                <label class="title-text">基础模型</label>
                <label id="base-model-label" class="main-text">-</label>
            `;
            return;
        }
        infoContainer.innerHTML = `
            <label class="title-text">文件名</label>
            <label id="filename-label" class="main-text">-</label>
            <label class="title-text">文件大小</label>
            <label id="file-size-label" class="main-text">-</label>
        `;
    }

    const downloadUrl = document.getElementById("download-url")

    updateInfo()
    presetSelections.addEventListener("change", () => updateInfo());
}