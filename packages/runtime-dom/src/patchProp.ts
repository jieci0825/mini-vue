import { isOn } from '@vue/shared'
import { patchClass } from './modules/class'

export function patchProp(el: Element, key: string, prevValue: any, nextValue: any) {
    if (key === 'class') {
        patchClass(el, nextValue)
    } else if (key === 'style') {
        // todo 处理 style
    } else if (isOn(key)) {
        // todo 处理事件
    } else {
        // todo 处理其他属性
    }
}
