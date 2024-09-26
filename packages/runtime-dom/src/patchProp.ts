import { isOn } from '@vue/shared'
import { patchClass } from './modules/class'
import { patchStyle } from './modules/style'

export function patchProp(el: Element, key: string, prevValue: any, nextValue: any) {
    if (key === 'class') {
        patchClass(el, nextValue)
    } else if (key === 'style') {
        patchStyle(el, nextValue)
    } else if (isOn(key)) {
        // todo 处理事件
    } else {
        // todo 处理其他属性
    }
}
