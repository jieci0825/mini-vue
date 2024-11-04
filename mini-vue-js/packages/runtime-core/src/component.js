import { ref, shallowRef } from '@vue/reactivity'
import { hasChanged, isFunction } from '@vue/shared'
import { Text } from './vnode'
import { onUnmounted } from './apiLifecycle'

export function createComponentInstance(vnode) {
  const instance = {
    state: {},
    isMounted: false,
    subTree: null,
    component: null,
    slots: null,
    vnode,
    // 在组件实例中添加 mounted 数组，用来存储通过 onMounted 函数注册的生命周期钩子函数
    mounted: [],
    unmounted: []
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

export function defineAsyncComponent(options) {
  // options 可以是配置项，也可以是加载器
  if (isFunction(options)) {
    options = {
      loader: options
    }
  }

  const { loader } = options

  let InnerComp = null

  // 记录重试次数
  let retries = 0
  // 封装 load 函数用来加载异步组件
  function load() {
    return (
      loader()
        // 捕获加载器的错误
        .catch(err => {
          // 如果用户指定了 onError 回调，则将控制权交给用户
          if (options.onError) {
            // 返回一个新的 Promise 实例
            return new Promise((resolve, reject) => {
              // 重试
              const retry = () => {
                resolve(load())
                retries++
              }
              // 失败
              const fail = () => reject(err)
              // 作为 onError 回调函数的参数，让用户来决定下一步怎么做
              options.onError(retry, fail, retries)
            })
          } else {
            throw err
          }
        })
    )
  }

  return {
    name: 'AsyncComponentWrapper',
    setup() {
      let loaded = ref(false)
      // 定义 error，当错误发生时，用来存储错误对象
      const error = shallowRef(null)
      // 一个标志，代表是否正在加载，默认为 false
      let loading = ref(false)

      let loadingTimer = null
      // 如果配置项中存在 delay，则开启一个定时器计时，当延迟到时后将 loading.value 设置为 true
      if (options.delay) {
        loadingTimer = setTimeout(() => {
          loading.value = true
        }, options.delay)
      } else {
        // 如果没有，则直接标记为加载中
        loading.value = true
      }

      // 调用 load 函数加载组件
      load()
        .then(c => {
          InnerComp = c
          loaded.value = true
        })
        .catch(err => {
          error.value = err
        })
        .finally(() => {
          loading.value = false
          clearTimeout(loadingTimer)
        })

      loader()
        .then(c => {
          InnerComp = c
          loaded.value = true
        })
        .catch(err => {
          // 添加 catch 语句来捕获加载过程中的错误
          error.value = err
        })
        .finally(() => {
          // 完成后，无论成功还是失败，都将 loading.value 重置为 false
          loading.value = false
          // 无论加载成功还是失败，都清除定时器
          clearTimeout(loadingTimer)
        })

      let timer = null
      if (options.timeout) {
        timer = setTimeout(() => {
          // 超时后创建一个错误对象，并复制给 error.value
          const err = new Error(
            `Async component timed out after ${options.timeout}ms.`
          )
          error.value = err
        }, options.timeout)
      }

      // 包装组件被卸载时清除定时器
      onUnmounted(() => {
        clearTimeout(timer)
      })

      // 占位内容
      const placeholder = { type: Text, children: '' }

      return () => {
        if (loaded.value) {
          // 如果组件异步加载成功，则渲染被加载的组件
          return { type: InnerComp }
        } else if (error.value && options.errorComponent) {
          // 只有当错误存在且用户配置了 errorComponent 时才展示 Error 组件，同时将 error 作为 props 传递
          return { type: options.errorComponent, props: { error: error.value } }
        } else if (loading.value && options.loadingComponent) {
          // 如果异步组件正在加载，并且用户指定了 Loading 组件，则渲染 Loading 组件
          return { type: options.loadingComponent }
        }
        return placeholder
      }
    }
  }
}
