import { startsWith } from '@vue/shared'
import {
    ElementNode,
    ElementTypes,
    NodeTypes,
    RootNode,
    TextNode,
    InterpolationNode
} from './ast'

export interface CursorPos {
    line: number
    column: number
    offset: number
}

export interface ParseContext {
    line: number
    column: number
    offset: number
    source: string
    originSource: string
}

export const enum TagType {
    Start,
    End
}

/**
 * 创建解析上下文
 */
function createParserContext(content: string): ParseContext {
    return {
        line: 1, //当前解析到的行数
        column: 1, //当前解析到的列数
        offset: 0, //当前解析到的偏移量
        source: content,
        originSource: content
    }
}

export function createRoot(children): RootNode {
    return {
        type: NodeTypes.ROOT,
        children: children || [],
        helpers: [],
        components: [],
        directives: [],
        hoists: [],
        imports: [],
        temps: [],
        codegenNode: undefined,
        cached: []
    }
}

function isEnd(context: ParseContext) {
    const s = context.source
    if (s.length === 0) return true
    return false
}

export function baseParse(content: string): RootNode {
    const context = createParserContext(content)

    let nodes: any = []
    while (!isEnd(context)) {
        const source = context.source

        let node: any

        if (startsWith(source, '<')) {
            // 解析标签
            node = '111'
        } else if (startsWith(source, '{{')) {
            // 解析插值
            node = parseInterpolation(context)
            debugger
        }

        // 没有则当做文本处理
        if (!node) {
            // 解析文本
            node = parseText(context)
        }

        node && nodes.push(node)
    }

    return createRoot([])
}

function parseInterpolation(context: ParseContext) {
    const start = getCursor(context)
    // 吃掉 {{
    advanceBy(context, 2)
    const insertStart = getCursor(context)
    const insertEnd = getCursor(context)
    // 结束 token
    const closeIndex = context.source.indexOf('}}')
    // 获取内容
    const preContent = parseTextData(context, closeIndex)
    // 去掉前后空格
    const content = preContent.trim()
    // 开始偏移量
    let startOffset = preContent.indexOf(content)
    // 如果大于 0，则表示前面有空格
    if (startOffset > 0) {
        advancePositionWithMutation(insertStart, preContent, startOffset)
    }
    const endOffset = startOffset + content.length
    advancePositionWithMutation(insertEnd, preContent, endOffset)

    // 吃掉 }}
    advanceBy(context, 2)
    const end = getCursor(context)
    return {
        type: NodeTypes.INTERPOLATION,
        content: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content,
            isStatic: false,
            // {{  xxx }} 这里应该求的是'xxx'，不能包含{{}}和'xxx'前后的空格，所以需要去掉
            loc: getSelection(context, insertStart, insertEnd)
        },
        loc: getSelection(context, start, end)
    }
}

function parseText(context: ParseContext) {
    // 结束 token
    const endTokens = ['<', '{{']

    // 文本结束索引
    let endIndex = context.source.length

    // 遍历结束 tokens
    //  - 寻找离得最近的结束 token 的索引
    for (let i = 0; i < endTokens.length; i++) {
        // 获取结束 token 的索引
        const index = context.source.indexOf(endTokens[i])
        // 如果存在结束 token，并且索引小于 endIndex，则更新 endIndex
        if (index !== -1 && index < endIndex) {
            endIndex = index
        }
    }

    // 获取截取文本内容之前的光标信息
    const startCursor = getCursor(context)

    // 获取内容
    const content = parseTextData(context, endIndex)

    return {
        type: NodeTypes.TEXT,
        content,
        loc: getSelection(context, startCursor),
        isStatic: true
    }
}

// 获取选区
function getSelection(context: ParseContext, start: any, end?: any) {
    end = end || getCursor(context)
    return {
        // 开始光标信息
        start,
        // 结束光标信息
        end,
        // 这部分选区的字符源码
        source: context.originSource.slice(start.offset, end.offset)
    }
}

function parseTextData(context: ParseContext, endIndex: number) {
    // 截取文本内容
    const rawText = context.source.slice(0, endIndex)
    // 吃掉文本内容
    advanceBy(context, endIndex)
    return rawText
}

function advanceBy(context: ParseContext, endIndex: number) {
    const source = context.source

    // 每次删除内容之前的时候，更新行列信息
    advancePositionWithMutation(context, source, endIndex)

    context.source = source.slice(endIndex)
}

function advancePositionWithMutation(
    context: CursorPos,
    source: string,
    endIndex: number
) {
    // 行数-遇到回车 +1
    let linesCount = 0
    // 记录换行的索引位置
    let linePos = -1

    for (let i = 0; i < endIndex; i++) {
        if (source.charCodeAt(i) === 10) {
            linesCount++
            linePos = i
        }
    }

    context.offset += endIndex
    context.line += linesCount

    // 如果没有换行，则直接当前列数 + endIndex 即可
    // 如果有换行，则用 endIndex 减去当前换行的位置，即可得到光标，在当前行的第几列
    context.column =
        linePos === -1 ? context.column + endIndex : endIndex - linePos
}

function advanceSpaces(context: ParseContext) {
    const match = /^[\r\n\s]+/.exec(context.source)
    if (match) {
        advanceBy(context, match[0].length)
        return true
    }
    return false
}

function getCursor(context: ParseContext) {
    let { line, column, offset } = context
    return {
        line,
        column,
        offset
    }
}

function parseChildren(context: ParseContext, ancestors: []) {}
