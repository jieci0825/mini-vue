import { startsWith } from '@vue/shared'
import { ElementTypes, NodeTypes } from './ast'

export interface ParseContext {
    source: string
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
        source: content
    }
}

export function createRoot(children) {
    return {
        type: NodeTypes.ROOT,
        children,
        loc: {}
    }
}

export function baseParse(content: string) {
    const context = createParserContext(content)
    // 通过不断的解析，来生成 ast
    const children = parseChildren(context, [])
    return createRoot(children)
}

function parseChildren(context: ParseContext, ancestors) {
    const ndoes = []

    // 判断是否是结束标签-如果是一个结束标签的话，则不需要继续解析了
    while (!isEnd(context)) {
        const s = context.source
        let node

        if (startsWith(s, '{{')) {
            // todo 处理 vue 的模板语法
        } else if (startsWith(s[0], '<')) {
            // 检测 < 后面跟的是不是字母
            if (/[a-z]$/.test(s[1])) {
                node = parseElement(context, ancestors)
            }
        }

        // 如果当前节点不存在，则尝试解析文本节点
        if (!node) {
            node = parseText(context)
        }

        pushNode(ndoes, node)
    }

    return ndoes
}

/**
 * 解析元素
 */
function parseElement(context: ParseContext, ancestors) {
    // * 处理标签的开始
    const element = parseTag(context, TagType.Start)

    // * 处理标签的 children
    // 将当前此元素的区域作为父元素推入 ancestors 数组
    ancestors.push(element)
    // 解析这个元素的所有子节点，并接收返回子节点数组
    const children = parseChildren(context, ancestors)
    // 解析完毕后，将当前元素从 ancestors 数组中移除
    ancestors.pop()
    // 将子节点数组赋值给 element 的 children 属性，生成一个完整的元素节点区域树结构
    element.children = children

    // * 处理标签的结束
    if (startsWithEndTagOpen(context.source, element.tag)) {
        parseTag(context, TagType.End)
    }

    return element
}

/**
 * 解析文本
 */
function parseText(context: ParseContext) {
    // 定义结束 tokens - 遇到 < 或 {{ 就结束
    const endTokens = ['<', '{{']

    // 获取开始解析时的代码字符结束index
    let endIndex = context.source.length

    /* 
    * case:
    <div>
        hello world
        <div></div>
    </div>
    实际一般来说，走到这里的 hello world 这个文本的时候，source 应该是 hello world<div></div>
    */

    // 遍历所有的结束标签，找到最短的一个。即索引小的那一个，索引小就是离文本结束最近的地方
    for (let i = 0; i < endTokens.length; i++) {
        const index = context.source.indexOf(endTokens[i])
        // 添加 endIndex > index 的条件，进行边界的限制
        if (index !== -1 && endIndex > index) {
            endIndex = index
        }
    }

    // 通过索引获取文本内容
    const content = parseTextData(context, endIndex)

    return {
        type: NodeTypes.TEXT,
        content,
        loc: {}
    }
}

/**
 * 返回裁剪的内容和移动光标的位置
 */
function parseTextData(context: ParseContext, length: number) {
    // 根据索引进行截取，拿到这串应该展示的文本
    const rawText = context.source.slice(0, length)
    // 并移动光标到截取完字符串的位置
    advanceBy(context, length)
    return rawText
}

/**
 * 解析标签
 */
function parseTag(context: ParseContext, type: TagType) {
    // 通过正则表达式匹配HTML 标签的开头部分，并捕获标签名
    // 定义解析标签的正则：表示必须以 < 开头，/可加可不加，且第一个字符必须以字母开头，后面可以跟任意字符，只要不是空格和标签结束的符号，都是合法的名称
    // 这段正则解析 <div class="box">hello world</div> 会得到一个数组 ['<div', 'div]
    const match: any = /^<\/?([a-z][^\r\n\t\f />]*)/i.exec(context.source)
    // 获取标签名称
    const tag = match[1]
    // 获取移动的长度-这里表示 ”<div“ 这个字符串的长度，后续 > | /> 都会 isSelfClosing 的处理被吃掉
    const len = match[0].length
    // 移动指针-得到标签名称之后，就应该把标签名和前面的 < 符号都吃掉(<div)
    advanceBy(context, len)

    // 判断当前标签是否是一个自闭合的标签 <input /> | <div></div>
    let isSelfClosing = startsWith(context.source, '/>')
    // 根据判断的结果，移动指针。自闭合两位，非自闭合一位
    advanceBy(context, isSelfClosing ? 2 : 1)

    // todo 类型这里还要多一层处理，判断这个标签是元素还是组件

    return {
        type: NodeTypes.ELEMENT,
        tag,
        tagType: ElementTypes.ELEMENT,
        props: [],
        children: [],
        loc: {}
    }
}

function pushNode(ndoes, node) {
    ndoes.push(node)
}

// 判断当前的标签是否是结束标签
function isEnd(context: ParseContext) {
    const source = context.source
    // source 为空字符串 或者开头是结束标签，就表示要结束解析了
    return !source || source.startsWith('</')
}

/**
 * 检查当前的模板字符串是否是一个以结束标签开头的片段
 * @description 结束标签通常形如 </div>，这个函数的主要作用就是判断字符串是否以 </ 开始，并且紧接着是某个标签名。
 */
function startsWithEndTagOpen(source: string, tag: string): boolean {
    // source.startsWith('</')：判断字符串是否以 </ 开头，标志着可能是一个结束标签
    // source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase()：从 </ 开始后，继续检查接下来的字符串是否与传入的标签名匹配（不区分大小写）
    // /[\t\n\f />]/.test(source[2 + tag.length] || '>')：确保结束标签名后面的字符是合法的结束标签字符（如空格、换行符、> 等
    return (
        startsWith(source, '</') &&
        source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase() &&
        /[\t\n\f />]/.test(source[2 + tag.length] || '>')
    )
}

/**
 * 移动解析位置
 * @description 将模板解析的指针向前移动，从而跳过指定长度的字符
 */
function advanceBy(context: ParseContext, numberOfChars: number) {
    context.source = context.source.slice(numberOfChars)
}
