import {
  EMPTY_OBJ,
  hasChanged,
  isArray,
  isFunction,
  isObject,
  isOn,
  isString
} from '@vue/shared'
import { normalizeClass } from './normalizeProp'
import { Fragment, isSameVNodeType, Text } from './vnode'
import {
  effect,
  reactive,
  shallowReactive,
  shallowReadonly
} from '@vue/reactivity'
import { queuePreFlushCbs } from './scheduler'
import {
  createComponentInstance,
  createRenderContext,
  emit,
  resolveProps
} from './component'
import { setCurrentInstance } from './apiLifecycle'

export function createRenderer(options) {
  return baseCreateRenderer(options)
}

function baseCreateRenderer(options) {
  const {
    createElement: hostCreateElement,
    setText: hostSetText,
    insert: hostInsert,
    patchProp: hostPatchProp,
    createText: hostCreateText,
    createComment: hostCreateComment
  } = options

  function patch(n1, n2, container, anchor = null) {
    if (n1 && !isSameVNodeType(n1, n2)) {
      unmount(n1)
      n1 = null
    }

    // 经过前面的判断表示，n1 和 n2 是一个类型的节点
    const { type } = n2
    // 如果是字符串表示的是文本节点
    if (isString(type)) {
      if (!n1) {
        mountElement(n2, container, anchor)
      } else {
        patchElement(n1, n2, anchor)
      }
    } else if (type === Text) {
      // 处理文本节点
      if (!n1) {
        mountText(n2, container, anchor)
      } else {
        patchText(n1, n2, anchor)
      }
    } else if (type === Comment) {
      if (!n1) {
        mountComment(n2, container, anchor)
      } else {
        patchComment(n1, n2, anchor)
      }
    } else if (type === Fragment) {
      if (!n1) {
        mountFragment(n2, container)
      } else {
        patchFragment(n1, n2, container)
      }
    }
    // 适配状态组件和函数函数式组件
    else if (isObject(type) || isFunction(type)) {
      if (!n1) {
        mountComponent(n2, container, anchor)
      } else {
        patchComponent(n1, n2, anchor)
      }
    } else {
      // TODO 处理其他情况
    }
  }

  function patchComponent(n1, n2, anchor) {
    // 获取组件实例，即 n1.component，同时让新的组件虚拟节点 n2.component 也指向组件实例
    const instance = (n2.component = n1.component)
    // 获取当前的 props 数据
    const { props } = instance
    // 调用 hasPropsChanged 检测为子组件传递的 props 是否发生变化，如果没有变化，则不需要更新
    if (hasPropsChanged(n1.props, n2.props)) {
      // 调用 resolveProps 函数重新获取 props 数据
      const [nextProps] = resolveProps(n2.type.props, n2.props)
      // 更新 props
      for (const k in nextProps) {
        props[k] = nextProps[k]
      }
      // 删除不存在的 props
      for (const k in props) {
        if (!(k in nextProps)) {
          delete props[k]
        }
      }
    }
  }

  function hasPropsChanged(prevProps, nextProps) {
    const nextKeys = Object.keys(nextProps)
    // 如果新旧 props 的数量变了，则说明有变化
    if (nextKeys.length !== Object.keys(prevProps).length) {
      return true
    }

    // 如果新旧 props 的数量一样，则逐个对比 props 的值
    for (let i = 0; i < nextKeys.length; i++) {
      const key = nextKeys[i]
      // 有不相等的 props，则说明有变化，即比较两个值是否存在变化
      if (hasChanged(nextProps[key], prevProps[key])) return true
    }
    return false
  }

  function mountComponent(vnode, container, anchor) {
    let componentOptions = vnode.type

    // 检查是否是函数式组件
    /**
     * @example
     * function MyFunctionalComponent(props) {
     *   return { type: 'div', children: props.title }
     * }
     * MyFunctionalComponent.props = { title: String }
     *
     * const vnode = {
     *    type: MyFunctionalComponent
     * }
     */
    if (isFunction(vnode.type)) {
      // 如果是函数是组件，则将 vnode.type 作为 render 函数
      componentOptions = {
        render: vnode.type,
        props: vnode.type.props
      }
    }

    const {
      setup,
      render,
      data,
      props: propsOption,
      beforeCreate,
      created,
      beforeMount,
      mounted,
      beforeUpdate,
      updated
    } = componentOptions

    beforeCreate && beforeCreate()

    // 创建组件实例
    const instance = (vnode.component = createComponentInstance(vnode))

    // 解析 props 和 attrs
    const [props, attrs] = resolveProps(propsOption, vnode.props)
    instance.props = shallowReactive(props)

    // 当组件状态-即初始化 data
    const state = reactive(data ? data() : {})
    instance.state = state

    // 渲染下上文
    const renderContext = createRenderContext(instance)

    // 处理插槽
    const slots = vnode.children || {}
    instance.slots = slots

    // 获取 setup 函数的上下文
    const setupContext = { attrs, emit, slots }

    // 在调用 setup 函数之前，设置当前组件实例
    setCurrentInstance(instance)
    // 执行 setup 函数，并获取其返回值
    const setupResult =
      setup && setup(shallowReadonly(instance.props), setupContext)
    // 在 setup 函数执行完毕之后，重置当前组件实例
    setCurrentInstance(null)

    let setupState = null
    // 根据 setup 函数的返回值，处理 render 函数的调用
    if (isFunction(setupResult)) {
      if (render) console.error('setup 函数返回渲染函数，render 选项将被忽略')
      render = setupResult
    } else {
      setupState = setupResult
    }

    instance.setupState = setupState

    created && created.call(renderContext)

    effect(
      () => {
        const subTree = render.call(renderContext, renderContext)
        if (instance.isMounted) {
          beforeUpdate && beforeUpdate.call(renderContext)

          patch(instance.subTree, subTree, container, anchor)

          updated && updated.call(renderContext)
        } else {
          beforeMount && beforeMount.call(renderContext)

          patch(null, subTree, container, anchor)
          instance.isMounted = true

          mounted && mounted.call(renderContext)
          instance.mounted &&
            instance.mounted.forEach(hook => hook.call(renderContext))
        }

        instance.subTree = subTree
      },
      {
        scheduler: ect => {
          // 将组件状态导致的更新放入微队列中，等待同步任务执行完毕后执行
          //  - 将多次状态改变导致的更新合并为一次更新
          queuePreFlushCbs(ect.fn)
        }
      }
    )
  }

  function mountFragment(vnode, container) {
    // 因为 Fragment 本身不渲染，只会渲染子节点，所以这里只要处理子节点即可
    vnode.children.forEach(child => {
      patch(null, child, container)
    })
  }

  function patchFragment(n1, n2, container) {
    // 更新也是一样，只需要更新子节点即可
    //  - patchChildren 在前文已经实现
    patchChildren(n1, n2, container)
  }

  function patchComment(n1, n2, anchor) {
    const el = (n2.el = n1.el)
    if (n2.children !== n1.children) {
      hostSetText(el, n2.children, anchor)
    }
  }

  function mountComment(vnode, container, anchor) {
    const el = (vnode.el = hostCreateComment(vnode.children))
    hostInsert(el, container)
  }

  function patchText(n1, n2, anchor) {
    const el = (n2.el = n1.el)
    if (n2.children !== n1.children) {
      hostSetText(el, n2.children, anchor)
    }
  }

  function mountText(vnode, container, anchor) {
    // 创建文本节点
    const el = (vnode.el = hostCreateText(vnode.children))
    // 插入文本节点内容
    hostInsert(el, container, anchor)
  }

  function unmount(vnode) {
    // 卸载时，如果是 Fragment 则需要卸载子节点
    if (vnode.type === Fragment) {
      vnode.children.forEach(child => {
        unmount(child)
      })
      return
    } else if (isObject(vnode.type)) {
      // 对于组件的卸载，本质上是要卸载组件所渲染的内容，即 subTree
      unmount(vnode.component.subTree)
      return
    }

    const { el } = vnode
    const parent = el.parentNode
    if (parent) {
      parent.removeChild(el)
    }
  }

  function mountElement(vnode, container, anchor) {
    // 让 vnode.el 引用真实的 dom 元素
    const el = (vnode.el = hostCreateElement(vnode.type))
    if (isString(vnode.children)) {
      hostSetText(el, vnode.children)
    } else if (isArray(vnode.children)) {
      // 如果是一个数组的话，需要循环调用patch
      vnode.children.forEach(child => {
        patch(null, child, el, anchor)
      })
    }

    if (vnode.props) {
      // ! 暂时：如果有属性且存在 class 则进行提前处理
      if (vnode.props.class) {
        vnode.props.class = normalizeClass(vnode.props.class)
      }

      for (const key in vnode.props) {
        hostPatchProp(el, key, null, vnode.props[key])
      }
    }

    hostInsert(el, container, anchor)
  }

  function patchElement(n1, n2, anchor) {
    // 将旧vnode上的 el 赋值给 新vnode的 el 属性，实现 dom 元素复用
    const el = (n2.el = n1.el)
    const oldProps = n1.props || EMPTY_OBJ
    const newProps = n2.props || EMPTY_OBJ

    // 更新 props
    for (const key in newProps) {
      // 如果新属性和就旧属性不一样，则更新
      if (newProps[key] !== oldProps[key]) {
        hostPatchProp(el, key, oldProps[key], newProps[key])
      }
    }

    // 移除旧属性
    //  - 如果旧属性是一个空对象，则不需要处理
    if (oldProps !== EMPTY_OBJ) {
      for (const key in oldProps) {
        //  - 遍历旧props，如果旧props上存在的属性，但是在新props上不存在，则移除
        if (!(key in newProps)) {
          hostPatchProp(el, key, oldProps[key], null)
        }
      }
    }

    patchChildren(n1, n2, el, anchor)
  }

  function patchChildren(n1, n2, container, anchor) {
    // 判断新vnode的 children 是否是文本节点
    if (isString(n2.children)) {
      // 旧节点有三种情况：文本节点、数组、空
      // 如果旧节点是一个数组时，则将旧节点依次卸载
      if (isArray(n1.children)) {
        n1.children.forEach(child => {
          unmount(child)
        })
      }
      // 如果旧节点不存在或者是文本节点，且不一致时，则更新为文本节点
      if (n1.children !== n2.children) {
        hostSetText(container, n2.children)
      }
    }
    // 新vnode 的 children 是一个数组
    else if (isArray(n2.children)) {
      // 如果旧节点的 children 也是数组，则需要进行 diff 算法
      if (isArray(n1.children)) {
        const oldChildren = n1.children
        const newChildren = n2.children
        if (newChildren[0].key) {
          patchKeyedChildren(oldChildren, newChildren, container)
        } else {
          patchUnkeyedChildren(oldChildren, newChildren, container)
        }
      } else {
        // 此时旧节点只能是文本节点或者空
        // 但是不管是那个情况，直接清空旧节点即可
        hostSetText(container, '')
        // 依次挂载新节点
        n2.children.forEach(child => {
          patch(null, child, container)
        })
      }
    }
    // 新节点的 children 是空
    else {
      // 如果旧节点children是一个数组，则依次卸载
      if (isArray(n1.children)) {
        n1.children.forEach(child => {
          unmount(child)
        })
      }
      // 如果旧节点children是文本节点，则清空
      if (isString(n1.children)) {
        hostSetText(container, '')
      }
      // 新旧节点的 children 都是空，则不需要处理
    }
  }

  function patchKeyedChildren(c1, c2, container) {
    // 处理相同的前置节点
    let j = 0
    let oldVNode = c1[j]
    let newVNode = c2[j]

    // while 循环，向后遍历，直到遇到不一样的节点为止
    while (isSameVNodeType(oldVNode, newVNode)) {
      // 打补丁
      patch(oldVNode, newVNode, container)
      // 更新索引
      j++
      // 更新节点
      oldVNode = c1[j]
      newVNode = c2[j]
    }

    // 处理相同的后置节点
    let oldEnd = c1.length - 1
    let newEnd = c2.length - 1
    oldVNode = c1[oldEnd]
    newVNode = c2[newEnd]

    while (isSameVNodeType(oldVNode, newVNode)) {
      // 打补丁
      patch(oldVNode, newVNode, container)
      // 更新索引
      oldEnd--
      newEnd--
      // 更新节点
      oldVNode = c1[oldEnd]
      newVNode = c2[newEnd]
    }

    // 预处理完毕之后，如果满足以下条件，则进行新增
    if (j > oldEnd && j <= newEnd) {
      // 获取锚点的位置
      const nextPos = newEnd + 1
      // 获取锚点元素
      const anchor = nextPos < c2.length ? c2[nextPos].el : null
      // 进行循环遍历，依次新增节点
      while (j <= newEnd) {
        patch(null, c2[j++], container, anchor)
      }
    } else if (oldEnd >= j && j > newEnd) {
      // 进行循环遍历，依次卸载节点
      while (j <= oldEnd) {
        unmount(c1[j++])
      }
    } else {
      // 新的一组节点中剩余需要处理节点的数量
      const count = newEnd - j + 1
      // 构造 source 数组
      const source = new Array(count)
      source.fill(-1)

      // 设置起始索引
      const oldStart = j
      const newStart = j
      // 新增两个变量
      let moved = false
      let pos = 0

      // 构建索引表
      const keyIndex = {}
      for (let i = newStart; i <= newEnd; i++) {
        // 以 vnode 的 key 属性为键，在 newChildren 中的索引为值
        keyIndex[c2[i].key] = i
      }

      // 记录更新过的节点的数量
      let patched = 0
      // 遍历 oldChildren 中未处理的节点
      for (let i = oldStart; i <= oldEnd; i++) {
        const oldVNode = c1[i]
        if (patched <= count) {
          // 通过 旧节点的 key 在索引表中获取索引值
          const k = keyIndex[oldVNode.key]

          // 如果索引存在，则说明该节点需要移动
          if (k !== undefined) {
            const newVNode = c2[k]
            // 打补丁
            patch(oldVNode, newVNode, container)
            // 更新 source 数组-记录下这个新节点在 oldChildren 中的索引位置
            source[k - newStart] = i
            // 每更新一个节点，patched++
            patched++

            // 判断节点是否需要移动
            //  - 即采用类似递增索引的方式来判断是否需要移动
            if (k < pos) {
              moved = true
            } else {
              pos = k
            }
          } else {
            // 如果索引不存在，说明这个旧的vnode在 newChildren 中不存在，说明该节点需要卸载
            unmount(oldVNode)
          }
        } else {
          // 如果更新过的节点数量大于需要更新的节点数量，则说明剩下的 oldChildren 中的节点都是需要卸载的
          unmount(oldVNode)
        }
      }

      if (moved) {
        const seq = getSequence(source)

        // s 指向最长递增子序列的最后一个元素的索引
        let s = seq.length - 1
        // i 指向新的一组子节点的最后一个节点的索引
        let i = count - 1
        // 从后向前遍历，依次处理需要移动的节点
        for (i; i >= 0; i--) {
          if (source[i] === -1) {
            // 如果为 -1，说明该节点是新增的
            // 获取这个新增节点在 newChildren 中的位置索引
            const pos = i + newStart
            const newVNode = c2[pos]
            // 这个节点的下一个节点位置索引
            const nextPos = pos + 1
            // 获取锚点元素
            const anchor = nextPos < c2.length ? c2[nextPos].el : null
            // 挂载
            patch(null, newVNode, container, anchor)
          } else if (i !== seq[s]) {
            // 如果节点的索引 i 不等于最长递增子序列的最后一个元素的索引 s
            // 则说明该节点需要移动

            // 获取这个节点在 newChildren 中的位置索引
            const pos = i + newStart
            const newVNode = c2[pos]
            // 这个节点的下一个节点位置索引
            const nextPos = pos + 1
            // 获取锚点元素
            const anchor = nextPos < c2.length ? c2[nextPos].el : null
            // 移动
            hostInsert(newVNode.el, container, anchor)
          } else {
            // 如果节点的索引 i 等于最长递增子序列的最后一个元素的索引 s
            // 则说明该节点不需要移动，更新 s 的值
            s--
          }
        }
      }
    }
  }

  function patchUnkeyedChildren(c1, c2, container) {
    // 获取新子节点长度
    const newLen = c2.length
    // 获取旧子节点长度
    const oldLen = c1.length
    // 获取最小长度
    const minLen = Math.min(oldLen, newLen)
    // 使用最小值依次比较新旧子节点，完成公共节点的复用
    for (let i = 0; i < minLen; i++) {
      patch(c1[i], c2[i], container)
    }

    // 如果新子节点长度大于旧子节点长度，则说明有新增节点，则新增节点
    if (newLen > oldLen) {
      c2.slice(minLen).forEach(child => {
        patch(null, child, container)
      })
    }
    // 如果旧子节点长度大于新子节点长度，则说明有删除节点，则删除节点
    else if (newLen < minLen) {
      c1.slice(newLen).forEach(child => {
        unmount(child)
      })
    }
  }

  function render(vnode, container) {
    if (vnode) {
      patch(container._vnode, vnode, container)
    } else {
      if (container._vnode) {
        unmount(container._vnode)
      }
    }
    container._vnode = vnode
  }

  return {
    render
  }
}

// https://en.wikipedia.org/wiki/Longest_increasing_subsequence
function getSequence(arr) {
  const p = arr.slice()
  const result = [0]
  let i, j, u, v, c
  const len = arr.length
  for (i = 0; i < len; i++) {
    const arrI = arr[i]
    if (arrI !== 0) {
      j = result[result.length - 1]
      if (arr[j] < arrI) {
        p[i] = j
        result.push(i)
        continue
      }
      u = 0
      v = result.length - 1
      while (u < v) {
        c = (u + v) >> 1
        if (arr[result[c]] < arrI) {
          u = c + 1
        } else {
          v = c
        }
      }
      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1]
        }
        result[u] = i
      }
    }
  }
  u = result.length
  v = result[u - 1]
  while (u-- > 0) {
    result[u] = v
    v = p[v]
  }
  return result
}
