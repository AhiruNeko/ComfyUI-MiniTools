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

class Node {
    constructor(value) {
        this.value = value;
        this.next = null;
    }
}

export class LinkedList {
    constructor() {
        this.head = null;
    }

    append(value) {
        const newNode = new Node(value);
        if (!this.head) {
            this.head = newNode;
            return;
        }
        let current = this.head;
        while (current.next) {
            current = current.next;
        }
        current.next = newNode;
    }

    clear(callBackFunc) {
        const value = this.head.value;
        this.deleteFrom(value, callBackFunc);
    }

    deleteFrom(value, callBackFunc) {
        if (!this.head) return;
        if (this.head.value === value) {
            let toDelete = this.head;
            this.head = null;
            this._processDeletion(toDelete, callBackFunc);
            return;
        }
        let current = this.head;
        while (current.next) {
            if (current.next.value === value) {
                let toDelete = current.next;
                current.next = null;
                this._processDeletion(toDelete, callBackFunc);
                return;
            }
            current = current.next;
        }
    }

    insertAfter(targetValue, newValue) {
        let current = this.head;
        while (current) {
            if (current.value === targetValue) {
                const newNode = new Node(newValue);
                newNode.next = current.next;
                current.next = newNode;
                return true;
            }
            current = current.next;
        }
        return false;
    }

    removeNode(value, callBackFunc) {
        if (!this.head) return;
        if (this.head.value === value) {
            const tempValue = this.head.value;
            this.head = this.head.next;
            if (typeof callBackFunc === 'function') callBackFunc(tempValue);
            return;
        }
        let current = this.head;
        while (current.next) {
            if (current.next.value === value) {
                const nodeToDelete = current.next;
                const tempValue = nodeToDelete.value;
                current.next = nodeToDelete.next;
                if (typeof callBackFunc === 'function') callBackFunc(tempValue);
                return;
            }
            current = current.next;
        }
    }

    _processDeletion(node, callBackFunc) {
        if (typeof callBackFunc !== 'function') return;
        let temp = node;
        while (temp) {
            callBackFunc(temp.value);
            temp = temp.next;
        }
    }

    print() {
        let current = this.head;
        let res = [];
        while (current) {
            res.push(current.value);
            current = current.next;
        }
        console.log(res.length ? res.join(" -> ") : "Empty");
    }

    toList(startValue = null, endValue = null) {
        let current = this.head;
        const res = [];
        if (startValue !== null) {
            while (current && current.value !== startValue) {
                current = current.next;
            }
        }
        if (!current) return [];

        while (current) {
            res.push(current.value);
            if (endValue !== null && current.value === endValue) {
                break;
            }
            current = current.next;
        }
        return res;
    }
}