import { EMPTY_OBJ, isArray, isObject, isString } from '@vue/shared'
import { normalizeClass } from './normalizeProp'
import { isSameVNodeType, Text } from './vnode'

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

  function patch(n1, n2, container) {
    if (n1 && !isSameVNodeType(n1, n2)) {
      unmount(n1)
      n1 = null
    }

    // 经过前面的判断表示，n1 和 n2 是一个类型的节点
    const { type } = n2
    // 如果是字符串表示的是文本节点
    if (isString(type)) {
      if (!n1) {
        mountElement(n2, container)
      } else {
        patchElement(n1, n2)
      }
    }
    // 处理文本节点
    else if (type === Text) {
      if (!n1) {
        mountText(n2, container)
      } else {
        patchText(n1, n2)
      }
    } else if (type === Comment) {
      if (!n1) {
        mountComment(n2, container)
      } else {
        patchComment(n1, n2)
      }
    } else if (type === Fragment) {
      if (!n1) {
        mountFragment(n2, container)
      } else {
        patchFragment(n1, n2, container)
      }
    }
    // 如果是对象表示是组件
    else if (isObject(type)) {
      // todo 处理组件
    } else {
      // TODO 处理其他情况
    }
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

  function patchComment(n1, n2) {
    const el = (n2.el = n1.el)
    if (n2.children !== n1.children) {
      hostSetText(el, n2.children)
    }
  }

  function mountComment(vnode, container) {
    const el = (vnode.el = hostCreateComment(vnode.children))
    hostInsert(el, container)
  }

  function patchText(n1, n2) {
    const el = (n2.el = n1.el)
    if (n2.children !== n1.children) {
      hostSetText(el, n2.children)
    }
  }

  function mountText(vnode, container) {
    // 创建文本节点
    const el = (vnode.el = hostCreateText(vnode.children))
    // 插入文本节点内容
    hostInsert(el, container)
  }

  function unmount(vnode) {
    // 卸载时，如果是 Fragment 则需要卸载子节点
    if (vnode.type === Fragment) {
      vnode.children.forEach(child => {
        unmount(child)
      })
      return
    }

    const { el } = vnode
    const parent = el.parentNode
    if (parent) {
      parent.removeChild(el)
    }
  }

  function mountElement(vnode, container) {
    // 让 vnode.el 引用真实的 dom 元素
    const el = (vnode.el = hostCreateElement(vnode.type))
    if (isString(vnode.children)) {
      hostSetText(el, vnode.children)
    } else if (isArray(vnode.children)) {
      // 如果是一个数组的话，需要循环调用patch
      vnode.children.forEach(child => {
        patch(null, child, el)
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

    hostInsert(el, container)
  }

  function patchElement(n1, n2) {
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

    patchChildren(n1, n2, el)
  }

  function patchChildren(n1, n2, container) {
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
        // diff 算法
        // 目前暂时还未涉及 diff 算法，所以使用暴力的循环进行更新

        // 先卸载旧节点
        n1.children.forEach(child => {
          unmount(child)
        })

        // 再挂载新节点
        n2.children.forEach(child => {
          patch(null, child, container)
        })
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
