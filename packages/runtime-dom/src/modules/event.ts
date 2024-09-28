export function patchEvent(el: Element, key: string, prev: any, next: any) {
    const evnetName = key.slice(2).toLowerCase()
    if (evnetName) {
        el.addEventListener(evnetName, next)
    }
    if (prev) {
        el.removeEventListener(evnetName, prev)
    }
}
