import { isArray, isObject, isString } from '@vue/shared'

export function normalizeClass(value) {
  let res = ''

  // 如果 value 是字符串则直接返回
  if (isString(value)) {
    res = value.trim()
  }
  // 如果 value 是数组
  else if (isArray(value)) {
    // 数组里面可以存储字符串也可以存储对象，所以只需要循环调用 normalizeClass 得到结果即可
    for (let i = 0; i < value.length; i++) {
      res += normalizeClass(value[i]) + ' '
    }
  }
  // 如果 value 是对象
  else if (isObject(value)) {
    for (const key in value) {
      // 如果值为 true 则添加到结果中
      if (value[key]) {
        res += `${key} `
      }
    }
  }

  return res.trim()
}
