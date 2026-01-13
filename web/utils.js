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

    isEmpty() {
        return this.head === null
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
        if (this.isEmpty()) return;
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

    insertBefore(targetValue, newValue) {
        if (!this.head) return false;
        if (this.head.value === targetValue) {
            const newNode = new Node(newValue);
            newNode.next = this.head;
            this.head = newNode;
            return true;
        }
        let current = this.head;
        while (current.next) {
            if (current.next.value === targetValue) {
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

    up(value) {
        if (!this.head || this.head.value === value) return null;
        if (this.head.next && this.head.next.value === value) {
            const prevValue = this.head.value;
            let second = this.head.next;
            this.head.next = second.next;
            second.next = this.head;
            this.head = second;
            return prevValue;
        }

        let current = this.head;
        while (current.next && current.next.next) {
            if (current.next.next.value === value) {
                let prev = current.next;
                let target = prev.next;
                const prevValue = prev.value;
                prev.next = target.next;
                target.next = prev;
                current.next = target;
                return prevValue;
            }
            current = current.next;
        }
        return null;
    }

    down(value) {
        if (!this.head) return null;
        if (this.head.value === value && this.head.next) {
            const postValue = this.head.next.value;
            let second = this.head.next;
            this.head.next = second.next;
            second.next = this.head;
            this.head = second;
            return postValue;
        }
        let current = this.head;
        while (current.next) {
            if (current.next.value === value) {
                let target = current.next;
                let post = target.next;

                if (!post) return null;

                const postValue = post.value;
                target.next = post.next;
                post.next = target;
                current.next = post;
                return postValue;
            }
            current = current.next;
        }
        return null;
    }
}