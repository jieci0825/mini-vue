export const isArray = (value: unknown): boolean => {
    return Array.isArray(value)
}

export const isObject = (value: unknown): boolean => {
    return typeof value === 'object' && value !== null
}
