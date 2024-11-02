import { isString } from '@vue/shared'

export function patchStyle(el, prev, next) {
  const style = el.style
  const isCssString = isString(next)
  if (next && !isCssString) {
    // 处理新的样式
    for (const key in next) {
      setStyle(style, key, next[key])
    }

    if (prev && !isCssString) {
      // 处理旧的样式
      for (const key in prev) {
        // 如果新的样式没有，则移除
        if (!next[key]) {
          setStyle(style, key, '')
        }
      }
    }
  } else {
    if (isCssString) {
      style.cssText = next
    } else {
      style.cssText = ''
    }
  }
}

function setStyle(style, name, next) {
  style[name] = next
}
