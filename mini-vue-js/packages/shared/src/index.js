export function isString(value) {
  return typeof value === 'string'
}

export function isSymbol(value) {
  return typeof value === 'symbol'
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

export const objectToString = Object.prototype.toString

export function toTypeString(value) {
  return objectToString.call(value)
}

export function toRawType(value) {
  return toTypeString(value).slice(8, -1)
}

export function isSet(value) {
  return toRawType(value) === 'Set'
}

export function isMap(value) {
  return toRawType(value) === 'Map'
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
