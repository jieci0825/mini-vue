import { hasChanged } from '@vue/shared'

export function createComponentInstance(vnode) {
  const instance = {
    state: {},
    isMounted: false,
    subTree: null,
    component: null,
    slots: null,
    vnode,
    // 在组件实例中添加 mounted 数组，用来存储通过 onMounted 函数注册的生命周期钩子函数
    mounted: []
  }

  return instance
}

// resolveProps 函数用于解析组件 props 和 attrs 数据
export function resolveProps(propsOption = {}, propsData = {}) {
  const props = {}
  const attrs = {}
  // 遍历为组件传递的 props 数据
  for (const key in propsData) {
    // 以字符串 on 开头的 props，无论是否显式地声明，都将其添加到 props 数据中，而不是添加到 attrs 中
    if (propsOption[key] || isOn(key)) {
      // 如果可以在组件中定义的 props 选项中找到对应的 key，则将其作为 props 数据
      props[key] = propsData[key]
    } else {
      // 否则将其作为 attrs
      attrs[key] = propsData[key]
    }
  }
  return [props, attrs]
}

// 创建渲染上下文对象，本质上是组件实例的代理
export function createRenderContext(instance) {
  const renderContext = new Proxy(instance, {
    get(target, key) {
      // 取得组件自身状态与 props 数据
      const { state, props, slots } = target

      // 当 key 的值为 $slots 时，直接返回组件实例上的 slots
      if (key === '$slots') return slots

      // 先尝试读取自身状态数据
      if (state && key in state) {
        return state[key]
      }
      // 如果组件自身没有该数据，则尝试从 props 中读取
      else if (key in props) {
        return props[key]
      } else if (instance.setupState && key in instance.setupState) {
        // 渲染上下文增加对 setupState 的支持
        return instance.setupState[key]
      } else {
        // 如果组件自身和 props 中都没有该数据，则返回 undefined
        return undefined
      }
    },
    set(target, key, value) {
      // 将数据写入组件自身的状态数据中
      const { state, props } = target
      if (state && key in state) {
        if (hasChanged(state[key], value)) {
          state[key] = value
        }
      } else if (key in props) {
        console.warn(`Attempting to mutate prop "${k}". Props are readonly.`)
      } else if (instance.setupState && key in instance.setupState) {
        // 渲染上下文增加对 setupState 的支持
        instance.setupState[key] = value
      } else {
        // 不存在
      }
      return true
    }
  })

  return renderContext
}

export function emit(event, ...payload) {
  const eventName = `on${event[0].toUpperCase() + event.slice(1)}`
  const handler = instance.props[eventName]
  if (handler) {
    handler(...payload)
  } else {
    console.warn(`Event "${event}" is not defined.`)
  }
}
