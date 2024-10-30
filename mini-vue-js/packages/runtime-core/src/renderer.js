import { EMPTY_OBJ, isArray, isObject, isString } from '@vue/shared'
import { normalizeClass } from './normalizeProp'
import { Fragment, isSameVNodeType, Text } from './vnode'

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
        patchElement(n1, n2)
      }
    }
    // 处理文本节点
    else if (type === Text) {
      if (!n1) {
        mountText(n2, container, anchor)
      } else {
        patchText(n1, n2)
      }
    } else if (type === Comment) {
      if (!n1) {
        mountComment(n2, container, anchor)
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

  function mountComment(vnode, container, anchor) {
    const el = (vnode.el = hostCreateComment(vnode.children))
    hostInsert(el, container)
  }

  function patchText(n1, n2) {
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

    hostInsert(el, container, anchor)
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
    // 四个索引值
    let oldStartIdx = 0
    let oldEndIdx = c1.length - 1
    let newStartIdx = 0
    let newEndIdx = c2.length - 1

    // 四个节点
    let oldStartVNode = c1[oldStartIdx]
    let oldEndVNode = c1[oldEndIdx]
    let newStartVNode = c2[newStartIdx]
    let newEndVNode = c2[newEndIdx]

    // 设置循环条件，防止数组越界
    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
      // 增加两个判断分支，如果头尾部节点为 undefined，表示处理过了，则跳过
      if (!oldStartVNode) {
        oldStartVNode = c1[++oldStartIdx]
      } else if (!oldEndVNode) {
        oldEndVNode = c1[--oldEndIdx]
      } else if (isSameVNodeType(oldStartVNode, newStartVNode)) {
        // 第一步
        patch(oldStartVNode, newStartVNode, container)
        // 更新索引值
        oldStartVNode = c1[++oldStartIdx]
        newStartVNode = c2[++newStartIdx]
      } else if (isSameVNodeType(oldEndVNode, newEndVNode)) {
        // 第二步
        // 新节点顺序也处于尾部，不需要移动，但仍需打补丁
        patch(oldEndVNode, newEndVNode, container)
        // 更新索引值
        oldEndVNode = c1[--oldEndIdx]
        newEndVNode = c2[--newEndIdx]
      } else if (isSameVNodeType(oldStartVNode, newEndVNode)) {
        // 第三步
        // 打补丁
        patch(oldStartVNode, newEndVNode, container)
        // 移动 DOM，将 oldStartVNode.el 移动到 oldEndVNode.el 的下一个兄弟节点之前
        // - 此时 oldEndVNode 是相对遍历比较的最后一个节点，而非是真实 DOM 的最后一个节点
        hostInsert(oldStartVNode.el, container, oldEndVNode.el.nextSibling)
        // 更新索引
        oldStartVNode = c1[++oldStartIdx]
        newEndVNode = c2[--newEndIdx]
      } else if (isSameVNodeType(oldEndVNode, newStartVNode)) {
        // 第四步
        patch(oldEndVNode, newStartVNode, container)
        hostInsert(oldEndVNode.el, container, oldStartVNode.el)
        oldEndVNode = c1[--oldEndIdx]
        newStartVNode = c2[++newStartIdx]
      } else {
        // 处理其他情况
        const idxInOld = c1.findIndex(node => {
          return isSameVNodeType(node, newStartVNode)
        })

        // 如果大于 0 则是找到了，等于 0 是不存在的，因为前面四步就校验过了
        if (idxInOld > 0) {
          const vnodeToMove = c1[idxInOld]
          // 打补丁
          patch(vnodeToMove, newStartVNode, container)
          // 移动 DOM
          hostInsert(vnodeToMove.el, container, oldStartVNode.el)
          // 由于 idxInOld 位置的节点已经移动，所以需要设置为 undefined
          c1[idxInOld] = undefined
        } else {
          // 如果没有找到，则创建新节点，并传入锚点
          patch(null, newStartVNode, container, oldStartVNode.el)
        }
        // 更新索引
        newStartVNode = c2[++newStartIdx]
      }
    }

    // 循环结束之后检查索引值的情况
    if (oldEndIdx < oldStartIdx && newStartIdx <= newEndIdx) {
      // oldEndIdx 小于 oldStartIdx，表示旧节点遍历完了
      // newStartIdx 小于或等于 newEndIdx，表示还有新节点没有处理，需要进行挂载
      // 可能存在多个，所以要使用 for 循环来处理
      for (let i = newStartIdx; i <= newEndIdx; i++) {
        // 锚点：如果 newEndIdx 下一个节点存在，则使用下一个节点，否则使用 null
        //  - 为 null 则表示这个多余的节点是处于尾部
        const anchor = c2[newEndIdx + 1] ? c2[newEndIdx + 1].el : null
        patch(null, c2[i], container, anchor)
      }
    } else if (newEndIdx < newStartIdx && oldStartIdx <= oldEndIdx) {
      // newEndIdx 小于 newStartIdx，表示新节点遍历完了
      // 且如果此时 oldStartIdx 小于或等于 oldEndIdx，表示还有旧节点没有处理，需要进行卸载
      // 可能存在多个，所以要使用 for 循环来处理
      for (let i = oldStartIdx; i <= oldEndIdx; i++) {
        unmount(c1[i])
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
