import { CREATE_VNODE } from './runtimeHelpers'
import { TransformContext } from './transform'

// 节点类型
export enum NodeTypes {
    ROOT,
    ELEMENT,
    TEXT,
    COMMENT,
    SIMPLE_EXPRESSION,
    INTERPOLATION,
    ATTRIBUTE,
    DIRECTIVE,
    // containers
    COMPOUND_EXPRESSION,
    IF,
    IF_BRANCH,
    FOR,
    TEXT_CALL,
    // codegen
    VNODE_CALL,
    JS_CALL_EXPRESSION,
    JS_OBJECT_EXPRESSION,
    JS_PROPERTY,
    JS_ARRAY_EXPRESSION,
    JS_FUNCTION_EXPRESSION,
    JS_CONDITIONAL_EXPRESSION,
    JS_CACHE_EXPRESSION,

    // ssr codegen
    JS_BLOCK_STATEMENT,
    JS_TEMPLATE_LITERAL,
    JS_IF_STATEMENT,
    JS_ASSIGNMENT_EXPRESSION,
    JS_SEQUENCE_EXPRESSION,
    JS_RETURN_STATEMENT
}

// 元素类型
export enum ElementTypes {
    ELEMENT,
    COMPONENT,
    SLOT,
    TEMPLATE
}

// 节点类型
export interface Node {
    type: NodeTypes
}

// 基础元素节点
export interface BaseElementNode extends Node {
    type: NodeTypes.ELEMENT
    tag: string
    props: any[]
    children: TemplateChildNode[]
}

// 组件节点
export interface ComponentNode extends BaseElementNode {
    tagType: ElementTypes.COMPONENT
}

// 普通元素节点 div | h | p ...
export interface PlainElementNode extends BaseElementNode {
    tagType: ElementTypes.ELEMENT
}

// 模板节点
export interface TemplateNode extends BaseElementNode {
    tagType: ElementTypes.TEMPLATE
}

// 插槽节点
export interface SlotNode extends BaseElementNode {
    tagType: ElementTypes.SLOT
}

// 元素节点
export type ElementNode = PlainElementNode | ComponentNode | TemplateNode | SlotNode

// 父节点
export type ParentNode = RootNode | ElementNode

// 模板里面的节点
export type TemplateChildNode = ElementNode | TextNode | CommentNode | InterpolationNode | CompoundExpressionNode

// 文本节点
export interface TextNode extends Node {
    type: NodeTypes.TEXT
    content: string
}

// 注释节点
export interface CommentNode extends Node {
    type: NodeTypes.COMMENT
    content: string
}

// 简单的表达式节点
export interface SimpleExpressionNode extends Node {
    type: NodeTypes.SIMPLE_EXPRESSION
    content: string
    isStatic: boolean
}

// 根节点
export interface RootNode extends Node {
    type: NodeTypes.ROOT
    children: any[]
}

// 插值语法
export interface InterpolationNode extends Node {
    type: NodeTypes.INTERPOLATION
    content: ExpressionNode
}

// 复合表达式节点
export interface CompoundExpressionNode extends Node {
    type: NodeTypes.COMPOUND_EXPRESSION
    children: (SimpleExpressionNode | InterpolationNode | CompoundExpressionNode | TextNode | string | symbol)[]
}

// 表达式
export type ExpressionNode = SimpleExpressionNode | CompoundExpressionNode

export function createVNodeCall(context: TransformContext, tag: string, props?, children?) {
    if (context) {
        // 放入一个函数名
        context.helper(CREATE_VNODE)
    }

    return {
        type: NodeTypes.VNODE_CALL,
        props,
        tag,
        children
    }
}

/**
 * 创建复合表达式节点
 */
export function createCompoundExpression(children: CompoundExpressionNode['children']) {
    return {
        type: NodeTypes.COMPOUND_EXPRESSION,
        children
    }
}
