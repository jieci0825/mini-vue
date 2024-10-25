const doc = document

export const nodeOps = {
  createElement(tag) {
    return doc.createElement(tag)
  },
  setText(el, text) {
    el.textContent = text
  },
  insert(el, parent, anchor = null) {
    parent.insertBefore(el, anchor)
  },
  createText(text) {
    return doc.createTextNode(text)
  },
  createComment(text) {
    return doc.createComment(text)
  }
}
