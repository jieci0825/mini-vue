const doc = document

function shouldSetAsProps(el, key, value) {
  // 特殊处理
  if (key === 'form' && el.tagName === 'INPUT') return false
  // 正常处理
  return key in el
}

export const nodeOps = {
  createElement(tag) {
    return doc.createElement(tag)
  },
  setText(el, text) {
    el.textContent = text
  },
  insert(el, parent, anchor = null) {
    parent.insertBefore(el, anchor)
  }
}
