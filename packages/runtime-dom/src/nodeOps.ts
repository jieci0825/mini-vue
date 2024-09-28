const doc = document

export const nodeOps = {
    insert: (child: any, parent: Element, anchor: any) => {
        if (anchor) {
            parent.insertBefore(child, anchor)
        } else {
            parent.appendChild(child)
        }
    },
    createElement: (tag: string) => {
        const el = doc.createElement(tag)
        return el
    },
    createTextNode: (text: string) => {
        return doc.createTextNode(text)
    },
    createComment: (comment: string) => {
        return doc.createComment(comment)
    },
    setText: (el: Element, text: string) => {
        el.textContent = text
    },
    remove: (child: Element) => {
        const parent = child.parentNode
        if (parent) {
            parent.removeChild(child)
        }
    }
}
