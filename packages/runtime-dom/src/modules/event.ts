export function patchEvent(el: Element & { _vei?: object }, key: string, prev: any, next: any) {
    // * 直接绑定和解绑是比较消耗性能的
    // const evnetName = key.slice(2).toLowerCase()
    // if (evnetName) {
    //     el.addEventListener(evnetName, next)
    // }
    // if (prev) {
    //     el.removeEventListener(evnetName, prev)
    // }

    // * 这里可以使用事件缓存的思想 vei vue event invokers
    // 初始化
    const invokers = el._vei || (el._vei = {})
    // 是否存在缓存
    const existingInvoker = invokers[key]

    // 新值存在且存在缓存，则表示是一个更新行为
    if (next && existingInvoker) {
        // 将新值的 Fn 赋值给缓存
        existingInvoker.value = next
    }
    // 没有缓存-非更新行为
    else {
        // 事件名
        const evnetName = parseName(key)
        // next 存在表示需要进行第一次绑定事件
        if (next) {
            const invoker = (invokers[key] = createInvoker(next))
            el.addEventListener(evnetName, invoker)
        }
        // next 不存在且缓存存在，则移除事件
        else if (existingInvoker) {
            el.removeEventListener(evnetName, existingInvoker)
            // 移除缓存
            invokers[key] = undefined
        }
    }
}

// 创建一个 invoker 函数，用于绑定事件
function createInvoker(initialValue: any) {
    const invoker: any = (e: any) => {
        // 触发事件实际就是调用 invoker.value 函数
        invoker.value(e)
    }
    // 把实际的事件处理函数赋值给 invoker.value
    invoker.value = initialValue
    return invoker
}

function parseName(key: string) {
    return key.slice(2).toLowerCase()
}
