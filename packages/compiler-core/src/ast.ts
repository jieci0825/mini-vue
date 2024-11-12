import { isString } from '@vue/shared'
import {
    CREATE_ELEMENT_VNODE,
    CREATE_TEXT_VNODE,
    CREATE_VNODE
} from './runtimeHelpers'
import { TransformContext } from './transform'

// 节点类型
export enum NodeTypes {
    ROOT, // 根节点
    ELEMENT, // 元素节点
    TEXT, // 文本节点
    COMMENT, // 注释节点
    SIMPLE_EXPRESSION, // 简单表达式节点
    INTERPOLATION, // 模板插值节点
    ATTRIBUTE, // 属性节点
    DIRECTIVE, // 指令节点

    // containers
    COMPOUND_EXPRESSION, // 复合表达式节点 {{a}} abc
    IF, // if节点
    IF_BRANCH, // if分支节点
    FOR, // for节点
    TEXT_CALL, // 文本调用节点

    // codegen
    VNODE_CALL, // 虚拟节点调用节点
    JS_CALL_EXPRESSION, // js调用表达式节点
    JS_OBJECT_EXPRESSION, // js对象表达式节点
    JS_PROPERTY, // js属性节点
    JS_ARRAY_EXPRESSION, // js数组表达式节点
    JS_FUNCTION_EXPRESSION, // js函数表达式节点
    JS_CONDITIONAL_EXPRESSION, // js条件表达式节点
    JS_CACHE_EXPRESSION, // js缓存表达式节点

    // ssr codegen
    JS_BLOCK_STATEMENT, // js块语句节点
    JS_TEMPLATE_LITERAL, // js模板字符串节点
    JS_IF_STATEMENT, // js if语句节点
    JS_ASSIGNMENT_EXPRESSION, // js赋值表达式节点
    JS_SEQUENCE_EXPRESSION, // js序列表达式节点
    JS_RETURN_STATEMENT // js返回语句节点
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
    loc: any
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
export type ElementNode =
    | PlainElementNode
    | ComponentNode
    | TemplateNode
    | SlotNode

// 父节点
export type ParentNode = RootNode | ElementNode

// 模板里面的节点
export type TemplateChildNode =
    | ElementNode
    | TextNode
    | CommentNode
    | InterpolationNode
    | CompoundExpressionNode

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
    codegenNode: any
    helpers: any
    imports: any
    components: any
    directives: any
    hoists: any
    temps: any
    cached: any
}

// 插值语法
export interface InterpolationNode extends Node {
    type: NodeTypes.INTERPOLATION
    content: ExpressionNode
}

// 复合表达式节点
export interface CompoundExpressionNode extends Node {
    type: NodeTypes.COMPOUND_EXPRESSION
    children: (
        | SimpleExpressionNode
        | InterpolationNode
        | CompoundExpressionNode
        | TextNode
        | string
        | symbol
    )[]
}

// 表达式
export type ExpressionNode = SimpleExpressionNode | CompoundExpressionNode

export function createVNodeCall(
    context: TransformContext,
    tag: string,
    props?,
    children?
) {
    context.helper(CREATE_ELEMENT_VNODE)
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
export function createCompoundExpression(
    children: CompoundExpressionNode['children']
) {
    return {
        type: NodeTypes.COMPOUND_EXPRESSION,
        children
    }
}

/**
 * 创建条件表达式节点
 */
export function createConditionalExpression(
    test,
    consequent,
    alternate,
    newline = true
) {
    return {
        type: NodeTypes.JS_CONDITIONAL_EXPRESSION,
        test,
        consequent,
        alternate,
        newline,
        loc: {}
    }
}

/**
 * 创建调用表达式的节点
 */
export function createCallExpression(context: TransformContext, args) {
    const callee = context.helper(CREATE_TEXT_VNODE)

    return {
        type: NodeTypes.JS_CALL_EXPRESSION,
        callee,
        arguments: args
    }
}

/**
 * 创建简单的表达式节点
 */
export function createSimpleExpression(content, isStatic) {
    return {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content,
        isStatic
    }
}

/**
 * 创建对象属性节点
 */
export function createObjectProperty(key, value) {
    return {
        type: NodeTypes.JS_PROPERTY,
        key: isString(key) ? createSimpleExpression(key, true) : key,
        value
    }
}

/**
 * 创建对象表达式节点
 */
export function createObjectExpression(properties) {
    return {
        type: NodeTypes.JS_OBJECT_EXPRESSION,
        properties
    }
}
