function toReactive(value) {
  return isObject(value) ? reactive(value) : value
}
