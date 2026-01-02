import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "ComfyUI.MiniTools.Linked",
    async setup() {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = new URL("./style.css", import.meta.url).href;
        document.head.appendChild(link);

        const resp = await fetch(new URL("./sidebar.html", import.meta.url).href);
        const html = await resp.text();
        const wrapper = document.createElement("div");
        wrapper.innerHTML = html;
        document.body.appendChild(wrapper);
        const btn = document.getElementById("minitools-toggle-btn");
        const sidebar = document.getElementById("minitools-sidebar");
        const sidebarHandle = document.getElementById("sidebar-drag-handle");
        const closeBtn = document.getElementById("minitools-close-btn");

        let btnX = 20, btnY = 60;
        let sidebarOffsetX = -10, sidebarOffsetY = -5;

        function updatePositions() {
            btn.style.left = btnX + "px";
            btn.style.top = btnY + "px";
            sidebar.style.left = (btnX + sidebarOffsetX) + "px";
            sidebar.style.top = (btnY + sidebarOffsetY) + "px";
        }
        updatePositions();

        function bindLinkedDrag(handleEl) {
            let startX, startY;
            let moved = false;

            const onMouseMove = (e) => {
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                    moved = true;
                    btnX += dx;
                    btnY += dy;
                    startX = e.clientX;
                    startY = e.clientY;
                    updatePositions();
                }
            };

            const onMouseUp = () => {
                document.removeEventListener("mousemove", onMouseMove);
                document.removeEventListener("mouseup", onMouseUp);
                if (!moved && handleEl === btn) {
                    sidebar.classList.toggle("minitools-hidden");
                }
            };

            handleEl.addEventListener("mousedown", (e) => {
                if (e.button !== 0) return;
                startX = e.clientX;
                startY = e.clientY;
                moved = false;
                document.addEventListener("mousemove", onMouseMove);
                document.addEventListener("mouseup", onMouseUp);
            });
        }

        bindLinkedDrag(btn);
        bindLinkedDrag(sidebarHandle);

        const initCollapsible = (container) => {
            const sections = container.querySelectorAll(".collapsible-section");
            sections.forEach(section => {
                const header = section.querySelector(".section-header");
                if (header) {
                    header.addEventListener("click", () => {
                        section.classList.toggle("active");
                    });
                }
            });
        };
        initCollapsible(wrapper);
        if (closeBtn) {
            closeBtn.onclick = () => sidebar.classList.add("minitools-hidden");
        }

        const moegirlSearchBtn = document.getElementById("moegirl-search-btn");
        const roleSearchInput = document.getElementById("role-search-input")
        const moegirlUrl = "https://moegirl.org"
        moegirlSearchBtn.addEventListener("click", () => {
            window.open(moegirlUrl + "/" + roleSearchInput.value, '_blank');
        });
    }
});