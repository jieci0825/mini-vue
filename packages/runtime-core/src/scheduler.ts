// 是否有挂起的任务
let isFlushPending = false
// 当前挂起的任务
let currentFlushPromise: Promise<void> | null = null
// 挂起的任务队列
const pendingPreFlushCbs: Function[] = []
// 一个已解决的Promise
const resolvedPromise = Promise.resolve() as Promise<any>

export function nextTick(fn?) {
    return fn ? resolvedPromise.then(fn) : resolvedPromise
}

// 将任务推入挂起队列
export function queuePreFlushCbs(cb: Function) {
    queueCb(cb, pendingPreFlushCbs)
}

// 将任务推入队列
function queueCb(cb: Function, pendingQueue: Function[]) {
    pendingQueue.push(cb)
    queueFlush()
}

// 将任务推入微队列
function queueFlush() {
    if (!isFlushPending) {
        isFlushPending = true
        // 将任务推入微队列
        currentFlushPromise = resolvedPromise.then(flushJobs)
    }
}

// 执行挂起的任务
function flushJobs() {
    isFlushPending = false
    flushPreFlushCbs()
}

// 执行挂起的任务
export function flushPreFlushCbs() {
    if (!pendingPreFlushCbs.length) return
    // 去重
    const activePreFlushCbs = [...new Set(pendingPreFlushCbs)]
    // 清空队列
    pendingPreFlushCbs.length = 0
    // 执行任务
    for (const job of activePreFlushCbs) {
        job()
    }
}
