export function patchClass(el: Element, value: string | null) {
    // 为 null 清空 class
    if (value == null) {
        el.removeAttribute('class')
    } else {
        // className 设置类名性能大于使用 setAttribute
        el.className = value
    }
}
