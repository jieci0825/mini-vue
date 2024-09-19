import { isReactive, isRef } from '@vue/reactivity'
import { EMPTY_OBJ, hasChanged, isFunction } from '@vue/shared'
import { ReactiveEffect } from 'packages/reactivity/src/effect'
import { queuePreFlushCbs } from './scheduler'

export interface WatchOptions {
    immediate?: boolean
    deep?: boolean
}

export function watch(source, cb: Function, options?: WatchOptions) {
    return doWatch(source, cb, options)
}

/**
 * watch 本质就是利用了 effect + options.scheduler 实现的
 */
function doWatch(source, cb: Function, options: WatchOptions = EMPTY_OBJ) {
    let { immediate = false, deep = false } = options

    // 将数据源转为 getter，作为 effec 收集依赖的函数
    let getter: () => any
    // 如果数据源是一个代理对象，创建一个访问数据源的函数，且 deep 自动为 true
    if (isReactive(source)) {
        getter = () => source
        deep = true
    }
    // 如果数据源是一个 ref 对象，创建一个访问 ref.value 的函数
    else if (isRef(source)) {
        getter = () => source.value
    }
    // 如果数据源是一个函数，则直接使用该函数作为 getter
    else if (isFunction(source)) {
        getter = source
    }
    // todo 处理对象源是一个数组的情况
    // 不符合上述情况，则进行警告
    else {
        getter = () => {}
        console.warn('监听的数据源类型错误')
    }

    const effect = new ReactiveEffect(getter, scheduler)

    // 初始化旧值
    let oldValue: any = undefined

    const job = () => {
        if (cb) {
            const newValue = effect.run()
            if (deep || hasChanged(oldValue, newValue)) {
                cb(newValue, oldValue)
                // 执行完成之后，更新旧值
                oldValue = newValue
            }
        }
    }

    function scheduler() {
        queuePreFlushCbs(job)
    }

    if (cb) {
        // 是否立即执行
        if (immediate) {
            job()
        } else {
            // 初始化旧值
            oldValue = effect.run()
        }
    } else {
        effect.run()
    }

    return () => {
        effect.stop()
    }
}
