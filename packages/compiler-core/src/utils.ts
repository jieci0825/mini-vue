import { NodeTypes, TextNode, InterpolationNode } from './ast'
import { CREATE_ELEMENT_VNODE, CREATE_VNODE } from './runtimeHelpers'

export function isText(value: any): value is TextNode | InterpolationNode {
    return value.type === NodeTypes.TEXT || value.type === NodeTypes.INTERPOLATION
}

export function getVNodeHelper(ssr: boolean, isComponent: boolean) {
    return ssr || isComponent ? CREATE_VNODE : CREATE_ELEMENT_VNODE
}
