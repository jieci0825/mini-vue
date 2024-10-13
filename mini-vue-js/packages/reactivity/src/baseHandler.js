import { track, trigger } from './effect'

function get(target, key, receiver) {
  track(target, key)
  return Reflect.get(target, key, receiver)
}

function set(target, key, value, receiver) {
  const result = Reflect.set(target, key, value, receiver)
  trigger(target, key)
  return result
}

export const mutableHandlers = {
  get,
  set
}
