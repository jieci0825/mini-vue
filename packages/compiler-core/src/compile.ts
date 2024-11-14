import { extend } from '@vue/shared'
import { baseParse } from './parse'
import { transform } from './transform'
import { transformElement } from './transforms/transformElement'
import { transformText } from './transforms/transformText'
import { generate } from './codegen'
import { transformExpression } from './transforms/transformExpression'

export function baseCompile(template: string, options = {}) {
    const ast = baseParse(template)

    // 做一些转换，即收集一些所需的方法
    //  - <div>{{aa}} 123</div> 实际创建的时候，不是创建两个子节点
    //  - 而是创建一个文本节点，包含 {{aa}} 123，即：createElementVNode('div', null, toDisplayString(aa) + '123')

    transform(
        ast,
        extend(options, {
            nodeTransforms: [
                transformElement,
                transformText,
                transformExpression
            ]
        })
    )

    return generate(ast)
}
