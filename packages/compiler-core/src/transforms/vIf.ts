import { isString } from '@vue/shared'
import {
    createCallExpression,
    createConditionalExpression,
    createObjectExpression,
    createObjectProperty,
    createSimpleExpression,
    NodeTypes
} from '../ast'
import { createStructuralDirectiveTransform, TransformContext } from '../transform'
import { getMemoedVNodeCall } from '../utils'
import { CREATE_COMMENT } from '../runtimeHelpers'

export const transformIf = createStructuralDirectiveTransform(/^(if|else-if|else)$/, (node, dir, context) => {
    return processIf(node, dir, context, (ifNode, branch, isRoot) => {
        // * 此回调给节点增加codegen属性
        let key = 0

        return () => {
            if (isRoot) {
                ifNode.codegen = createCodegenNodeForBranch(branch, key, context)
            } else {
            }
        }
    })
})

/**
 * v-if 的转化处理
 */
export function processIf(
    node,
    dir,
    context: TransformContext,
    processCodegen?: (node, branch, isRoot: boolean) => (() => void) | undefined
) {
    // 处理 if
    if (dir.name === 'if') {
        const branch = createIfBranch(node, dir)
        // 生成 if 指令节点，包含 branches
        const ifNode = {
            type: NodeTypes.IF,
            loc: node.loc,
            branches: [branch]
        }
        // 切换当前节点为 if 指令节点
        context.replaceNode(ifNode)
        // 处理 if 指令的codegen
        if (processCodegen) {
            return processCodegen(ifNode, branch, true)
        }
    }
}

/**
 * 创建 if 指令的 branch 属性节点
 */
export function createIfBranch(node, dir) {
    return {
        type: NodeTypes.IF_BRANCH,
        loc: {},
        condition: dir.exp,
        children: [node]
    }
}

/**
 * 生成分支节点的 codegenNode
 */
function createCodegenNodeForBranch(branch, keyIndex: number, context: TransformContext) {
    if (branch.condition) {
        return createConditionalExpression(
            branch.condition,
            createChildrenCodegenNode(branch, keyIndex),
            // 以注释的形式展示 v-if.
            createCallExpression(context.helper(CREATE_COMMENT), ['"v-if"', 'true'])
        )
    } else {
        return createChildrenCodegenNode(branch, keyIndex)
    }
}

/**
 * 创建指定子节点的 codegen 节点
 */
function createChildrenCodegenNode(branch, keyIndex: number) {
    const keyProperty = createObjectProperty(`key`, createSimpleExpression(`${keyIndex}`, false))
    const { children } = branch
    const firstChild = children[0]

    const ret = firstChild.codegenNode
    const vnodeCall = getMemoedVNodeCall(ret)
    // 填充 props
    injectProp(vnodeCall, keyProperty)
    return ret
}

export function injectProp(node, prop) {
    let propsWithInjection
    let props = node.type === NodeTypes.VNODE_CALL ? node.props : node.arguments[2]

    if (props == null || isString(props)) {
        propsWithInjection = createObjectExpression([prop])
    }
    if (node.type === NodeTypes.VNODE_CALL) {
        node.props = propsWithInjection
    }
}
