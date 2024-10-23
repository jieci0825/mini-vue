export function patchAttr(el, key, value) {
  if (value === null || value === undefined || value === false) {
    el.removeAttribute(key)
  } else {
    el.setAttribute(key, value)
  }
}
