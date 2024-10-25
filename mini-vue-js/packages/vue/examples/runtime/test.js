// 存储函数
const list = []

// 原始数据
const obj = {
  name: '张三'
}

const objProxy = new Proxy(obj, {
  // 拦截读取操作
  get(target, key) {
    console.log('get', target, key)
    return target[key]
  },
  // 拦截写入操作
  set(target, key, newVal) {
    console.log('set', target, key, newVal)
    target[key] = newVal
    // set 方法返回 true 表示成功，false 表示失败，失败时，当前操作无效
    return true
  }
})

// 测试
objProxy.name
objProxy.name = '李四'
