import { startsWith } from '@vue/shared'
import { NodeTypes } from './ast'

// 定义文本模式，作为一个状态表
//  - HTML实体：&copy;、&nbsp; 等，需要解析成对应的字符
//  - 标签：需要解析成对应的节点
const TextModes = {
  // 能否解析标签(√) & 是否支持HTML实体(√)
  DATA: 'DATA',
  // 能否解析标签(×) & 是否支持HTML实体(√)
  RCDATA: 'RCDATA',
  // 能否解析标签(×) & 是否支持HTML实体(×)
  RAWTEXT: 'RAWTEXT',
  // 能否解析标签(×) & 是否支持HTML实体(×)
  CDATA: 'CDATA'
}

// 标签类型
const TagTypes = {
  START: 'start',
  END: 'end'
}

// 定义状态机的状态
const State = {
  initial: 1, // 初始状态
  tagOpen: 2, // 标签开始状态
  tagName: 3, // 标签名称状态
  text: 4, // 文本状态
  tagEnd: 5, // 结束标签状态
  tagEndName: 6 // 结束标签名称状态
}

function createParserContext(content) {
  const context = {
    source: content,
    // 解析器当前处于文本模式，初始模式为 DATA
    mode: TextModes.DATA,
    /**
     * 移动解析位置
     * @description 将模板解析的指针向前移动，从而跳过指定长度的字符
     */
    advanceBy(numberOfChars) {
      context.source = context.source.slice(numberOfChars)
    },
    /**
     * 吃掉空白部分
     * @description 无论是开始标签还是结束标签，都可能存在无用的空白字符，例如 <div    >
     */
    advanceSpaces() {
      const match = /^[\t\r\n\f ]+/.exec(context.source)
      if (match) {
        // 调用 advanceBy 函数消费空白字符
        context.advanceBy(match[0].length)
      }
    }
  }

  return context
}

function createRoot(children = []) {
  return {
    type: NodeTypes.ROOT,
    children
  }
}

export function baseParse(content) {
  const context = createParserContext(content)

  // 调用 parseChildren 函数开始进行解析，它返回解析后得到的子节点
  const nodes = parseChildren(context, [])
  console.log(nodes)
  // 创建根节点，将子节点添加到根节点中
  return createRoot(nodes)

  // const tokens = tokenize(context)
  // const root = createRoot()
  // // 创建 elementStack 栈，起初只有 Root 根节点
  // const elementStack = [root]
  // // 开启一个 while 循环扫描 tokens，直到所有 Token 都被扫描完毕为止
  // while (tokens.length) {
  //   // 获取当前栈顶节点作为父节点 parent
  //   const parent = elementStack[elementStack.length - 1]
  //   // 当前扫描的 Token
  //   const token = tokens.shift()
  //   switch (token.type) {
  //     // * 元素标签-即开始标签
  //     case NodeTypes.ELEMENT:
  //       // 则创建 Element 类型的 AST 节点
  //       const elementNode = {
  //         type: NodeTypes.ELEMENT,
  //         tag: token.name,
  //         children: []
  //       }
  //       // 将其添加到父级节点的 children 中
  //       parent.children.push(elementNode)
  //       // 将其推入 elementStack 栈中，作为新的父级节点
  //       elementStack.push(elementNode)
  //       break
  //     // * 文本节点
  //     case NodeTypes.TEXT:
  //       const textNode = {
  //         type: NodeTypes.TEXT,
  //         content: token.content
  //       }
  //       // 加入到父级节点的 children 中
  //       parent.children.push(textNode)
  //       break
  //     // * 结束标签
  //     case NodeTypes.EOF:
  //       // 遇到结束标签，则从 elementStack 中弹出栈顶元素
  //       elementStack.pop()
  //       break
  //   }
  // }
  // return root
}

function tokenize(context) {
  const { advanceBy, advanceSpaces } = context

  // 状态机的当前状态：初始状态
  let currentState = State.initial
  // 存储缓存字符
  const chars = []
  // 存储 token
  const tokens = []

  // 吃掉空白部分
  advanceSpaces(context)

  // 使用 while 循环开启自动机
  while (context.source) {
    const char = context.source[0]

    // 匹配当前状态
    switch (currentState) {
      // * 初始状态
      case State.initial:
        // 如果遇到字符 <，则进入标签开始状态
        if (char === '<') {
          currentState = State.tagOpen
          // 吃掉字符 <
          advanceBy(context, 1)
        } else if (isAlpha(char)) {
          // 遇到字母，切换到文本状态
          currentState = State.text
          // 将当前字母缓存到 chars 数组
          chars.push(char)
          // 吃掉当前字母
          advanceBy(context, 1)
        }
        break
      // * 标签开始状态
      case State.tagOpen:
        // 标签开始状态下，遇到的字符如果是字母，则进入标签名称状态
        if (isAlpha(char)) {
          currentState = State.tagName
          chars.push(char)
          advanceBy(context, 1)
        } else if (char === '/') {
          // 遇到字符 /，比如自闭合标签，则进入结束标签状态
          currentState = State.tagEnd
          advanceBy(context, 1)
        }
        break
      // * 标签名称状态
      case State.tagName:
        // 如果是字母，则继续缓存
        if (isAlpha(char)) {
          chars.push(char)
          advanceBy(context, 1)
        } else if (char === '>') {
          // 遇到字符 >，则进入初始状态
          currentState = State.initial
          // 将标签名称添加到 tokens 数组
          //  - 注意，此时 chars 数组中缓存的字符就是标签名称
          tokens.push({
            type: NodeTypes.ELEMENT,
            name: chars.join('')
          })
          // 清空缓存
          chars.length = 0
          // 吃掉字符 >
          advanceBy(context, 1)
        }
        break
      // * 文本状态
      case State.text:
        // 遇到字母，状态不变继续缓存
        if (isAlpha(char)) {
          chars.push(char)
          advanceBy(context, 1)
        } else if (char === '<') {
          // 遇到字符 <，则进入标签开始状态
          currentState = State.tagOpen
          // 将文本添加到 tokens 数组
          tokens.push({
            type: NodeTypes.TEXT,
            content: chars.join('')
          })
          // 清空缓存
          chars.length = 0
          // 吃掉字符 <
          advanceBy(context, 1)
        }
        break
      // * 处于标签结束状态
      case State.tagEnd:
        // 遇到字母，则进入标签名称状态-即存储结束标签名称
        if (isAlpha(char)) {
          currentState = State.tagEndName
          chars.push(char)
          advanceBy(context, 1)
        }
        break
      // * 标签结束名称状态
      case State.tagEndName:
        if (isAlpha(char)) {
          chars.push(char)
          advanceBy(context, 1)
        } else if (char === '>') {
          currentState = State.initial
          tokens.push({
            type: NodeTypes.EOF,
            name: chars.join('')
          })
          chars.length = 0
          advanceBy(context, 1)
        }
        break
    }
  }

  return tokens
}

/**
 * 解析子节点
 * @param {*} context 上下文对象 context
 * @param {*} ancestors 由父代节点构成的栈，用于维护节点间的父子级关系
 */
function parseChildren(context, ancestors) {
  context.advanceSpaces()

  // 定义 nodes 数组存储子节点，它将作为最终的返回值
  let nodes = []
  // 开启 while 循环，只要满足条件就会一直对字符串进行解析
  while (!isEnd(context, ancestors)) {
    context.advanceSpaces()

    // 从上下文对象中取得当前状态，包括模式 mode 和模板内容 source
    const { mode, source } = context

    let node
    // 只有 DATA 模式和 RCDATA 模式才支持插值节点的解析
    if (mode === TextModes.DATA || mode === TextModes.RCDATA) {
      // 只有 DATA 模式才支持标签节点的解析
      if (mode === TextModes.DATA && source[0] === '<') {
        if (source[1] === '!') {
          if (startsWith(source, '<!--')) {
            // 解析注释节点
            node = parseComment(context)
          } else if (source.startsWith('<![CDATA[')) {
            node = parseCDATA(context, ancestors)
          }
        } else if (source[1] === '/') {
          // 结束标签-抛出错误
          // 状态机遭遇了闭合标签，此时应该抛出错误，因为它缺少与之对应的开始标签
          //  - 因为经过 isEnd 的判断之后，当前符合一个闭合标签的格式，但是没有找到与之对应的开始标签
          //  - 所以，这里需要抛出错误，例如：<div><span></div></span>，这里的 </span> 就无法找到对应的 <span>
          console.error('无效的结束标签')
          break
        } else if (/[a-z]/i.test(source[1])) {
          // 标签
          node = parseElement(context, ancestors)
        }
      } else if (source.startsWith('{{')) {
        // 解析插值节点
        node = parseInterpolation(context)
      }
    }
    // node 不存在，说明处于其他模式，即非 DATA 模式且非 RCDATA 模式
    // 这时一切内容都作为文本处理
    if (!node) {
      node = parseText(context)
    }

    // 将节点添加到 nodes 数组中
    nodes.push(node)
  }

  return nodes
}

function parseComment(context) {
  // 消费注释的开始部分
  context.advanceBy('<!--'.length)
  // 找到注释结束部分的位置索引
  let closeIndex = context.source.indexOf('-->')
  // 截取注释节点的内容
  const content = context.source.slice(0, closeIndex)
  // 消费内容
  context.advanceBy(content.length)
  // 消费注释的结束部分
  context.advanceBy('-->'.length)
  // 返回类型为 Comment 的节点
  return {
    type: NodeTypes.COMMENT,
    content
  }
}

function parseInterpolation(context) {
  const { advanceBy, advanceSpaces } = context

  advanceSpaces()

  const [open, close] = ['{{', '}}']

  // 消费开始定界符
  advanceBy(open.length)
  // 找到结束定界符的位置索引
  const closeIndex = context.source.indexOf(close, 1)
  if (closeIndex < 0) {
    console.error('插值缺少结束定界符')
  }
  // 截取开始定界符与结束定界符之间的内容作为插值表达式
  const content = context.source.slice(0, closeIndex)
  // 消费表达式的内容
  advanceBy(content.length)
  // 消费结束定界符
  advanceBy(close.length)

  advanceSpaces()

  return {
    type: NodeTypes.INTERPOLATION,
    // 插值节点的 content 是一个类型为 Expression 的表达式节点
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      isStatic: false,
      // todo 表达式节点的内容需要经过 decodeHtml 处理
      content
    }
  }
}

function parseText(context) {
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
    // todo 解码命名字符引用 decodeHtml
    content
  }
}

function parseElement(context, ancestors) {
  // 解析开始标签
  const element = parseTag(context, TagTypes.START)
  // 如果是自闭合标签，直接返回
  if (element.isSelfClosing) return element

  // 切换到正确的文本模式
  if (element.tag === 'textarea' || element.tag === 'title') {
    // 如果由 parseTag 解析得到的标签是 <textarea> 或 <title>，则切换到 RCDATA 模式
    context.mode = TextModes.RCDATA
  } else if (/style|xmp|iframe|noembed|noframes|noscript/.test(element.tag)) {
    // 如果由 parseTag 解析得到的标签是：
    // <style>、<xmp>、<iframe>、<noembed>、<noframes>、<noscript>
    // 则切换到 RAWTEXT 模式
    context.mode = TextModes.RAWTEXT
  } else {
    // 其他情况，切换到 DATA 模式
    context.mode = TextModes.DATA
  }

  // 解析子节点之前，先将当前节点压入父级节点栈
  ancestors.push(element)
  // 这里递归地调用 parseChildren 函数进行 <div> 标签子节点的解析
  element.children = parseChildren(context, ancestors)
  // 解析完成后，将当前节点从父级节点栈中弹出
  ancestors.pop()

  if (context.source.startsWith(`</${element.tag}`)) {
    // 再次调用 parseTag 函数解析结束标签
    parseTag(context, TagTypes.END)
  } else {
    console.error(`缺少结束标签：${element.tag}`)
    // 返回一个 null 当前标签是无效的，所以返回 null，不需要加入到 tree 中
    return null
  }
  return element
}

function parseTag(context, type) {
  const { advanceBy, advanceSpaces } = context

  advanceSpaces()

  // 处理开始标签和结束标签的正则表达式不同
  const match =
    type === TagTypes.START
      ? // 匹配开始标签
        /^<([a-z][^\t\r\n\f />]*)/i.exec(context.source)
      : // 匹配结束标签
        /^<\/([a-z][^\t\r\n\f />]*)/i.exec(context.source)
  // 匹配成功后，正则表达式的第一个捕获组的值就是标签名称
  const tag = match[1]
  // 消费正则表达式匹配的全部内容，例如 '<div' 这段内容
  advanceBy(match[0].length)
  // 消费标签名称后面的空格
  advanceSpaces()

  // 调用 parseAttributes 函数完成属性与指令的解析，并得到 props 数组，
  // props 数组是由指令节点与属性节点共同组成的数组
  const props = type === TagTypes.START ? parseAttributes(context) : []

  // 在消费匹配的内容后，如果字符串以 '/>' 开头，则说明这是一个自闭合标签
  const isSelfClosing = context.source.startsWith('/>')
  // 如果是自闭合标签，则消费 '/>'， 否则消费 '>'
  advanceBy(isSelfClosing ? 2 : 1)
  // 消费标签后面的空格
  advanceSpaces()

  // 返回标签节点
  return {
    type: NodeTypes.ELEMENT,
    tag,
    props,
    // 子节点暂时留空
    children: [],
    // 是否自闭合
    isSelfClosing
  }
}

function parseAttributes(context) {
  const { advanceBy, advanceSpaces } = context

  // 用来存储解析过程中产生的属性节点和指令节点
  const props = []

  // 开启 while 循环，不断地消费模板内容，直至遇到标签的“结束部分”为止
  while (!context.source.startsWith('>') && !context.source.startsWith('/>')) {
    // 该正则用于匹配属性名称
    const match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source)
    // 得到属性名称
    const name = match[0]
    // 消费属性名称
    advanceBy(name.length)
    // 消费空格
    advanceSpaces()
    // 消费等于号 =
    advanceBy(1)
    // 消费等于号与属性值之间的空白字符
    advanceSpaces()

    // 属性值
    let value = ''
    // 获取当前模板内容的第一个字符
    const quote = context.source[0]
    // 判断属性值是否被引号引用
    const isQuoted = quote === '"' || quote === "'"

    if (isQuoted) {
      // 属性值被引号引用，消费引号
      advanceBy(1)
      // 获取下一个引号的索引
      const endQuoteIndex = context.source.indexOf(quote)
      if (endQuoteIndex > -1) {
        // 获取下一个引号之前的内容作为属性值
        value = context.source.slice(0, endQuoteIndex)
        // 消费属性值
        advanceBy(value.length)
        // 消费引号
        advanceBy(1)
      } else {
        // 没有找到下一个引号，抛出错误
        console.error('缺少引号')
      }
    } else {
      // 代码运行到这里，说明属性值没有被引号引用
      // 下一个空白字符之前的内容全部作为属性值
      const match = /^[^\t\r\n\f >]+/.exec(context.source)
      // 获取属性值
      value = match[0]
      // 消费属性值
      advanceBy(value.length)
    }
    // 消费属性值后面的空白字符
    advanceSpaces()

    // 使用属性名称 + 属性值创建一个属性节点，添加到 props 数组中
    const propNode = {
      type: NodeTypes.ATTRIBUTE,
      name,
      value
    }
    props.push(propNode)
  }

  return props
}

/**
 * 返回裁剪的内容和移动光标的位置
 */
function parseTextData(context, length) {
  // 根据索引进行截取，拿到这串应该展示的文本
  const rawText = context.source.slice(0, length)
  // 并移动光标到截取完字符串的位置
  context.advanceBy(length)
  return rawText
}

function isEnd(context, ancestors) {
  // 当模板内容解析完毕后，停止
  if (!context.source) return true
  // 获取父级标签节点
  // const parent = ancestors[ancestors.length - 1]
  // 如果遇到结束标签，并且该标签与父级标签节点同名，则停止
  // if (parent && context.source.startsWith(`</${parent.tag}`)) {
  //   return true
  // }

  // 与父级节点栈内所有节点做比较
  for (let i = ancestors.length - 1; i >= 0; --i) {
    // 只要栈中存在与当前结束标签同名的节点，就停止状态机
    if (context.source.startsWith(`</${ancestors[i].tag}`)) {
      return true
    }
  }
}

// 一个辅助函数，用于判断是否是字母
function isAlpha(char) {
  return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z')
}
