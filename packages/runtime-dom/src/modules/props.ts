export function patchDOMProp(el: Element, key: string, value: any) {
    try {
        el[key] = value
    } catch (error) {}
}
