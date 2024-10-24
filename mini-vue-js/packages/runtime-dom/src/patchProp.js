import { isOn } from '@vue/shared'
import { patchAttr } from './modules/attr'
import { patchClass } from './modules/class'
import { patchEvent } from './modules/event'
import { patchDOMProp } from './modules/props'
import { patchStyle } from './modules/style'

export function patchProp(el, key, prevValue, nextValue) {
  if (key === 'class') {
    patchClass(el, nextValue)
  } else if (key === 'style') {
    patchStyle(el, prevValue, nextValue)
  } else if (isOn(key)) {
    patchEvent(el, key, prevValue, nextValue)
  }
  // 处理 DOM Properties
  else if (shouldSetAsProp(el, key)) {
    patchDOMProp(el, key, nextValue)
  }
  // 处理 HTML Attributes
  else {
    patchAttr(el, key, nextValue)
  }
}

function shouldSetAsProp(el, key) {
  if (key === 'form') {
    return false
  }
  if (key === 'list' && el.tagName === 'INPUT') {
    return false
  }
  if (key === 'type' && el.tagName === 'TEXTAREA') {
    return false
  }
  // 只要 key 是一个 dom对象上的属性，就可以直接设置
  return key in el
}
