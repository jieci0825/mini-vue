const { effect, reactive } = MiniVue

function ref(val) {
  const wrapper = {
    value: val
  }

  // 添加一个特殊属性，用于标识这个对象是否是一个 ref 对象
  //  - 且这个属性是不可枚举的，防止被遍历到
  Object.defineProperty(wrapper, '__v_isRef', {
    value: true
  })

  return reactive(wrapper)
}

function toRefs(obj) {
  const ret = {}
  // 遍历对象中的每一个属性
  for (const key in obj) {
    // 调用 toRef 函数完成转换
    ret[key] = toRef(obj, key)
  }
  return ret
}

function toRef(obj, key) {
  const wrapper = {
    get value() {
      return obj[key]
    },
    // 允许设置值
    set value(val) {
      obj[key] = val
    }
  }

  Object.defineProperty(wrapper, '__v_isRef', {
    value: true
  })

  return wrapper
}

function isRef(val) {
  return !!val.__v_isRef
}

function proxyRefs(target) {
  return new Proxy(target, {
    get(target, key, receiver) {
      const value = Reflect.get(target, key, receiver)
      return isRef(value) ? value.value : value
    },
    set(target, key, newValue, receiver) {
      const oldValue = target[key]
      // 如果是 ref，则设置其对应的 value 属性值
      if (isRef(oldValue)) {
        oldValue.value = newValue
        return true
      }
      return Reflect.set(target, key, newValue, receiver)
    }
  })
}
