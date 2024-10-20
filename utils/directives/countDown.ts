import type { Directive } from 'vue'

export default {
  mounted(el, binding) {
    // 获取按钮的初始文字(获取验证码)
    const normalText = el.textContent
    // 定义倒计时初始值，如果传有就使用传过来的，没有则默认60秒
    let count = binding.value || 60
    // 按钮被点击的时候
    el.onclick = () => {
    // 设置按钮禁用
      el.disabled = true
      // 数值开始-1
      count -= 1
      // 定义一个定时器，每秒执行一次
      const timer = setInterval(() => {
      // 如果当前count大于1，说明倒计时还未结束，那就修改按钮的文字，继续让count-1
        if (count > 1) {
          el.textContent = `（${count > 9 ? count : `0${count}`}）秒后重新发送`
          count -= 1
        }
        else {
        // 走到这里说明倒计时结束了，那就开始放开disabled，还原按钮的文字，并清空定时器
          el.disabled = false
          el.textContent = normalText
          clearInterval(timer)
        }
      }, 1000)
    }
  },
} as Directive
