const doc = document

export const nodeOps = {
  createElement(tag) {
    return doc.createElement(tag)
  },
  setText(el, text) {
    el.textContent = text
  },
  insert(el, parent, anchor = null) {
    if (anchor) {
      parent.insertBefore(el, anchor)
    } else {
      parent.appendChild(el)
    }
  },
  createText(text) {
    return doc.createTextNode(text)
  },
  createComment(text) {
    return doc.createComment(text)
  }
}
