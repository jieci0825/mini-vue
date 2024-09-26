import { camelToKebab, isArray, isObject, isString } from '@vue/shared'

export function normalizeClass(value: any): string {
    let res = ''
    if (isString(value)) {
        res = value
    } else if (isArray(value)) {
        for (const val of value) {
            const normalized = normalizeClass(val)
            if (normalized) {
                res += normalized + ' '
            }
        }
    } else if (isObject(value)) {
        for (const key in value) {
            if (value[key]) {
                res += key + ' '
            }
        }
    }

    return res.trim()
}

export function normalizeStyle(value: any): string {
    let res = ''
    if (isString(value)) {
        res = value
    } else if (isObject(value)) {
        for (const key in value) {
            const val = value[key]
            res += `${camelToKebab(key)}: ${val}; `
        }
    }
    return res.trim()
}
