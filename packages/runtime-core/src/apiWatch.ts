import { isReactive, isRef } from '@vue/reactivity'
import { EMPTY_OBJ, hasChanged, isFunction, isObject } from '@vue/shared'
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
        getter = () => {
            // 手动触发依赖收集
            //  - 这是一个取巧的方法，还需要考虑source的属性是一个对象的情况，需要递归处理
            // for (const key in source) {
            //     source[key]
            // }
            return source
        }
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

    // 检测是否需要深度监听
    if (cb && deep) {
        // 如果需要手动监听，则将 source 里面所有的属性都手动获取一次，实现依赖全收集
        const baseGetter = getter
        getter = () => traverse(baseGetter())
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

function traverse(value: any) {
    if (!isObject(value)) return value
    // 如果是一个对象，进行递归遍历，每次属性都获取一次，实现依赖收集
    for (const key in value) {
        traverse(value[key])
    }
    return value
}
