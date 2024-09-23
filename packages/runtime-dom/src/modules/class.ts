export function patchClass(el: Element, value: string | null) {
    // 为 null 清空 class
    if (value == null) {
        el.removeAttribute('class')
    } else {
        el.className = value
    }
}
