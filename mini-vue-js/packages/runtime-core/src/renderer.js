import { isArray, isString } from '@vue/shared'
import { normalizeClass } from './normalizeProp'

export function createRenderer(options) {
  return baseCreateRenderer(options)
}

function baseCreateRenderer(options) {
  const {
    createElement: hostCreateElement,
    setText: hostSetText,
    insert: hostInsert,
    patchProp: hostPatchProp
  } = options

  function patch(n1, n2, container) {
    if (!n1) {
      mountElement(n2, container)
    } else {
    }
  }

  function unmount(vnode) {
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
