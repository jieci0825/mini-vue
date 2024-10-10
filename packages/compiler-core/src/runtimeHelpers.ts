export const CREATE_ELEMENT_VNODE = Symbol('createElementVNode')
export const CREATE_VNODE = Symbol('createVNode')
export const TO_DISPLAY_STRING = Symbol('toDisplayString')
export const CREATE_COMMENT = Symbol('createComment')

export const helperNameMap = {
    [CREATE_ELEMENT_VNODE]: 'createElementVNode',
    [CREATE_VNODE]: 'createVNode',
    [TO_DISPLAY_STRING]: 'toDisplayString',
    [CREATE_COMMENT]: 'createComment'
}
