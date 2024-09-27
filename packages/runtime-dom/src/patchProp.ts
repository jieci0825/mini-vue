import { isOn } from '@vue/shared'
import { patchAttr, patchClass, patchStyle, patchDOMProp } from './modules'

export function patchProp(el: Element, key: string, prevValue: any, nextValue: any) {
    if (key === 'class') {
        patchClass(el, nextValue)
    } else if (key === 'style') {
        patchStyle(el, prevValue, nextValue)
    } else if (isOn(key)) {
        // todo 处理事件
    } else if (shouldSetAsProp(el, key)) {
        patchDOMProp(el, key, nextValue)
    } else {
        patchAttr(el, key, nextValue)
    }
}

function shouldSetAsProp(el: Element, key: string): boolean {
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
