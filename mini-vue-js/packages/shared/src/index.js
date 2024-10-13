export function isString(value) {
    return typeof value === 'string'
}

export function isObject(value) {
    return typeof value === 'object' && value !== null
}

export function isFunction(value) {
    return typeof value === 'function'
}

export function isNumber(value) {
    return typeof value === 'number'
}

export function isBoolean(value) {
    return typeof value === 'boolean'
}

export function isArray(value) {
    return Array.isArray(value)
}

export function isEqual(value1, value2) {
    return Object.is(value1, value2)
}

export const extend = Object.assign

export function hasChanged(oldValue, newValue) {
    return !Object.is(oldValue, newValue)
}

export function startsWith(value, searchString) {
    return value.startsWith(searchString)
}

export function isOn(value) {
    return value.startsWith('on')
}
