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
