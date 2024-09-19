export const isBoolean = (value: unknown): boolean => {
    return typeof value === 'boolean'
}

export const isString = (value: unknown): boolean => {
    return typeof value === 'string'
}

export const isNumber = (value: unknown): boolean => {
    return typeof value === 'number'
}

export const isArray = (value: unknown): boolean => {
    return Array.isArray(value)
}

export const isFunction = (value: unknown): boolean => {
    return typeof value === 'function'
}

export const isObject = (value: unknown): boolean => {
    return typeof value === 'object' && value !== null
}

export const isEqual = (value1: any, value2: any) => {
    return Object.is(value1, value2)
}

export const extend = Object.assign

export const EMPTY_OBJ: { readonly [key: string]: any } = {}

/**
 * 新旧两个值是否有变化
 * @param oldValue 旧值
 * @param newValue 新值
 * @returns boolean
 */
export const hasChanged = (oldValue: unknown, newValue: unknown): boolean => {
    return !Object.is(oldValue, newValue)
}
