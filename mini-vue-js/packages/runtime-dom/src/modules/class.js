export function patchClass(el, value) {
  if (value === null) {
    el.removeAttribute('class')
  } else {
    // className 设置类名性能大于使用 setAttribute
    el.className = value
  }
}
