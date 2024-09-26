export function patchStyle(el: Element, value: string | null) {
    // 为 null 清空 style
    if (value == null) {
        el.removeAttribute('style')
    } else {
        el.setAttribute('style', value)
    }
}
