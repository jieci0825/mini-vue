import { isArray } from '@vue/shared'

export function patchEvent(el, key, prevValue, nextValue) {
  const evnetName = key.slice(2).toLowerCase()
  let invokers = el._vei || (el._vei = {})
  let invoker = invokers[key]

  if (nextValue) {
    if (!invoker) {
      invoker = el._vei[key] = e => {
        // e.timeStamp 是事件触发的时间
        // 如果 e.timeStamp 小于于绑定事件的时间，则不执行
        if (e.timeStamp < invoker.attrched) return

        if (isArray(invoker.value)) {
          invoker.value.forEach(fn => fn(e))
        } else {
          invoker.value(e)
        }
      }
      invoker.value = nextValue
      // 添加时间绑定的时间
      invoker.attrched = performance.now()
      el.addEventListener(evnetName, invoker)
    } else {
      invoker.value = nextValue
    }
  } else if (invoker) {
    el.removeEventListener(evnetName, invoker)
  }
}
