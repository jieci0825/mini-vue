export function patchDOMProp(el, key, nextValue) {
  const type = typeof el[key]
  if (type === 'boolean' && nextValue === '') {
    el[key] = true
  } else {
    el[key] = nextValue
  }
}
