export function showToast(message, color="white") {
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
        border: 1px solid ${color}; 
        z-index: 100000;
        pointer-events: none;
        box-shadow: 0 2px 10px ${color}80; 
        transition: opacity 0.3s
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 300);
    }, 1500);
}