import { isObject, isString, isArray } from '@vue/shared'
import { normalizeClass } from './normalizeProp'

const IsVNode = '__v_isVNode'

export const Text = Symbol('Text')
export const Comment = Symbol('Comment')
export const Fragment = Symbol('Fragment')

export function isSameVNodeType(n1, n2) {
  return n1.type === n2.type && n1.key === n2.key
}

export const isVNode = vnode => {
  return vnode && vnode[IsVNode]
}

export function createVNode(type, props, children) {
  // 处理 props
  if (props) {
    const { class: klass } = props
    klass && (props.class = normalizeClass(klass))
  }

  // 处理 shapeFlag
  let shapeFlag = 0
  //  - 如果是一个 string 则当做一个 html 标签来处理
  // if (isString(type)) {
  //   shapeFlag = ShapeFlags.ELEMENT
  // }
  // - 如果是一个对象，则当做一个组件来处理
  // else if (isObject(type)) {
  //   shapeFlag = ShapeFlags.STATEFUL_COMPONENT
  // }

  return createBaseVNode(type, props, children, shapeFlag)
}

export { createVNode as createElementVNode }

function createBaseVNode(type, props, children, shapeFlag) {
  const vnode = {
    [IsVNode]: true,
    type,
    props,
    children,
    shapeFlag,
    el: null,
    key: props?.key ?? null,
    component: null
  }

  normalizeChildren(vnode, children)

  return vnode
}

export function normalizeChildren(vnode, children) {
  let type = 0

  // 如果是 null 表示没有子节点
  if (children === null || children === undefined) {
    children = null
  } else if (isArray(children)) {
    // type = ShapeFlags.ARRAY_CHILDREN
  } else if (isObject(children)) {
    // type = ShapeFlags.STATEFUL_COMPONENT
  } else if (isFunction(children)) {
    // todo 组件如果是一个函数，暂未处理
    // type = ShapeFlags.FUNCTIONAL_COMPONENT
  }
  // 都不是，则当做一个文本节点处理
  else {
    // 如果是一个 children 是一个字符串，则 ShapeFlags 需要包含这个类型，便于后续创建元素的时候可以通过这个来是否生成文本节点
    // type = ShapeFlags.TEXT_CHILDREN
    children = String(children)
  }

  vnode.children = children
  // 将之前的 shapeFlag 和新的 type 进行或运算，即合并起来，得到新的 shapeFlag
  // vnode.shapeFlag |= type
}
