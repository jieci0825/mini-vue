import { isString } from '@vue/shared'

export function createRenderer(options) {
  return baseCreateRenderer(options)
}

function baseCreateRenderer(options) {
  const {
    createElement: hostCreateElement,
    setText: hostSetText,
    insert: hostInsert
  } = options

  function patch(n1, n2, container) {
    if (!n1) {
      mountElement(n2, container)
    } else {
    }
  }

  function mountElement(vnode, container) {
    const el = hostCreateElement(vnode.type)
    if (isString(vnode.children)) {
      hostSetText(el, vnode.children)
    }
    hostInsert(el, container)
  }

  function render(vnode, container) {
    if (vnode) {
      patch(container._vnode, vnode, container)
    } else {
      if (container._vnode) {
        container.innerHTML = ''
      }

      container._vnode = vnode
    }
  }

  return {
    render
  }
}
