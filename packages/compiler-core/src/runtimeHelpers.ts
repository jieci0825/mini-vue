export const CREATE_ELEMENT_VNODE = Symbol('createElementVNode')
export const CREATE_VNODE = Symbol('createVNode')
export const TO_DISPLAY_STRING = Symbol('toDisplayString')
export const CREATE_COMMENT = Symbol('createComment')
export const CREATE_TEXT_VNODE = Symbol('createTextVNode')
export const CREATE_ELEMENT_BLOCK = Symbol('createElementBlock')
export const OPEN_BLOCK = Symbol('openBlock')
export const FRAGMENT = Symbol('FRAGMENT')

export const helperNameMap = {
    [CREATE_ELEMENT_VNODE]: 'createElementVNode',
    [CREATE_VNODE]: 'createVNode',
    [TO_DISPLAY_STRING]: 'toDisplayString',
    [CREATE_COMMENT]: 'createComment',
    [CREATE_TEXT_VNODE]: 'createTextVNode',
    [CREATE_ELEMENT_BLOCK]: 'createElementBlock',
    [OPEN_BLOCK]: 'openBlock',
    [FRAGMENT]: 'Fragment'
}
