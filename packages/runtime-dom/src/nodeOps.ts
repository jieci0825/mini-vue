const doc = document

export const nodeOps = {
    insert: (child: any, parent: Element, anchor: any) => {
        parent.insertBefore(child, anchor || null)
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
    setElementText: (el: Element, text: string) => {
        el.textContent = text
    },
    remove: (child: Element) => {
        const parent = child.parentNode
        if (parent) {
            parent.removeChild(child)
        }
    }
}
