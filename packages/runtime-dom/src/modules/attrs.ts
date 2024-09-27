export function patchAttr(el: Element, key: string, value: any) {
    if (value === null || value === undefined || value === false) {
        el.removeAttribute(key)
    } else {
        el.setAttribute(key, value)
    }
}
