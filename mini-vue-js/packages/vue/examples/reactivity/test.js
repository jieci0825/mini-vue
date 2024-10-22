const { effect, ref } = MiniVue

const count = ref(0)

effect(() => {
  console.log('effect-ref:', count.value)
})

count.value = 1
console.log(count.value)
