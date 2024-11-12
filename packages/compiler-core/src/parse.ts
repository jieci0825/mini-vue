import { startsWith } from '@vue/shared'
import { NodeTypes, RootNode } from './ast'

export interface ParseContext {
    line: number
    column: number
    offset: number
    source: string
    originSource: string
}

// 光标位置
export interface CursorPos {
    line: number
    column: number
    offset: number
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

export function createRoot(children, loc): RootNode {
    return {
        type: NodeTypes.ROOT, // Fragment
        children: children || [],
        helpers: [],
        components: [],
        directives: [],
        hoists: [],
        imports: [],
        temps: [],
        codegenNode: undefined,
        cached: [],
        loc
    }
}

function isEnd(context: ParseContext) {
    const s = context.source
    if (s.length === 0) return true
    if (startsWith(s, '</') || startsWith(s, '/>')) return true
    return false
}

export function baseParse(content: string): RootNode {
    const context = createParserContext(content)

    // 保存开始位置
    const start = getCursor(context)

    const children = parseChildren(context)

    // 利用一开始保存的开始位置和 getSelection 计算 loc
    const root = createRoot(children, getSelection(context, start))
    return root
}

function parseChildren(context: ParseContext) {
    let nodes: any = []
    while (!isEnd(context)) {
        const source = context.source

        let node: any

        if (startsWith(source, '<')) {
            // 解析标签
            node = parseElement(context)
            // 本次标签解析完成之后，开始新一轮的解析之前，先吃掉空白部分
            // advanceSpaces(context)
        } else if (startsWith(source, '{{')) {
            // 解析插值
            node = parseInterpolation(context)
        }

        // 没有则当做文本处理
        if (!node) {
            // 解析文本
            node = parseText(context)
        }

        node && nodes.push(node)
    }

    nodes.forEach((node, index) => {
        if (node.type === NodeTypes.TEXT) {
            // 检测是否是一个空白节点
            if (/^[\t\r\n\f ]+/.test(node.content)) {
                nodes[index] = null
            }
        }
    })

    // 过滤空白节点
    return nodes.filter(Boolean)
}

function parseElement(context: ParseContext) {
    const element = parseTag(context)
    // 如果是一个自闭合标签，则直接返回
    if (element.isSelfClosing) return element

    // 如果不是自闭合标签，则继续标签内的子元素
    element.children = parseChildren(context)

    // 处理当前 element 的结束标签
    if (startsWith(context.source, '</')) {
        parseTag(context, TagType.End)
    }

    // 开始拿到 element 的 loc 属性的 end 是错误的，
    // - 因为 element 的 children 还没有解析完，上面记录的知识 <div> 的开始位置的结束部分
    // - 所以要重新记录一下 element 的结束位置
    element.loc = getSelection(context, element?.loc?.start)

    return element
}

function parseTag(context: ParseContext, type: TagType = TagType.Start) {
    const start = getCursor(context)
    const match = /^<\/?([a-z][^\t\r\n\f />]*)/i.exec(context.source) || []
    if (!match) {
        console.warn('错误的语法标签')
        return {}
    }
    const tagName = match[1]
    // 吃掉标签开始标签 <div
    advanceBy(context, match[0]!.length)
    // 吃掉中间的空格
    advanceSpaces(context)

    // 解析属性
    const props = type === TagType.Start ? parseAttributes(context) : []

    // 检测是否是一个自闭合的标签
    const isSelfClosing = startsWith(context.source, '/>')
    const endTagLen = isSelfClosing ? 2 : 1
    // 吃掉结束标签
    advanceBy(context, endTagLen)

    return {
        type: NodeTypes.ELEMENT,
        tag: tagName,
        isSelfClosing,
        children: [],
        props,
        loc: getSelection(context, start)
    }
}

function parseAttributes(context: ParseContext) {
    const props: any[] = []

    // 如果不是以 > 或者 / 开头，则表示还有属性，就要继续循环解析
    while (
        context.source.length > 0 &&
        !(startsWith(context.source, '>') || startsWith(context.source, '/>'))
    ) {
        const prop = parseAttribute(context)
        prop && props.push(prop)
        // 每处理完成一个属性之后，删除掉空白
        advanceSpaces(context)
    }

    return props
}

function parseAttribute(context: ParseContext) {
    const start = getCursor(context)

    // 属性名字
    const match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source)
    if (!match) return undefined

    // 获取属性名字
    const propName = match[0]
    // 吃掉属性名字
    advanceBy(context, propName.length)

    // 吃掉可能存在的空格
    advanceSpaces(context)

    // 检测是否存在等号，如果存在则解析属性值
    //  - 如果没有则表示属性值是 true
    const isEqual = startsWith(context.source, '=')
    isEqual && advanceBy(context, 1)

    // 吃掉可能存在的空格
    advanceSpaces(context)

    // 属性值
    let value: any = null
    // 如果存在等号，则解析属性值
    if (isEqual) {
        value = parseAttributeValue(context)
    }

    const end = getCursor(context)

    return {
        type: NodeTypes.ATTRIBUTE,
        name: propName,
        // 没有属性值则默认为 true
        value: value || {
            type: NodeTypes.TEXT,
            content: true,
            loc: getSelection(context, start, end)
        },
        loc: getSelection(context, start, end)
    }
}

function parseAttributeValue(context: ParseContext) {
    // 确定属性值的引号
    let quote = context.source[0]
    if (quote !== '"' && quote !== "'") {
        console.warn('错误的属性语法')
        return undefined
    }
    // 吃掉引号
    advanceBy(context, 1)
    // 获取属性值开始的光标位置
    const insertStart = getCursor(context)
    // 获取本次属性值的结束索引
    const endQuoteIndex = context.source.indexOf(quote)
    if (endQuoteIndex === -1) {
        console.warn('属性没有结束引号')
        return undefined
    }
    // 获取属性值
    const propValue = parseTextData(context, endQuoteIndex)
    // 获取属性值结束的光标位置
    const insertEnd = getCursor(context)
    // 吃掉引号
    advanceBy(context, 1)

    return {
        type: NodeTypes.TEXT,
        content: propValue,
        loc: getSelection(context, insertStart, insertEnd)
    }
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
