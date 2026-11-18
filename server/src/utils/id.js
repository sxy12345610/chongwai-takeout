import { randomInt } from 'node:crypto'

/** 生成业务单号：前缀 + 时间戳 + 随机数，保证可读性与唯一性。 */
function buildNo(prefix) {
  const d = new Date()
  const pad = (n, l = 2) => String(n).padStart(l, '0')
  const ts =
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  // 4 位随机数降低同秒冲突概率
  const rand = randomInt(1000, 9999)
  return `${prefix}${ts}${rand}`
}

export const generateOrderNo = () => buildNo('CW')
export const generateCheckoutGroupNo = () => buildNo('GRP')
export const generateOutTradeNo = () => buildNo('PAY')
export const generateTaskNo = () => buildNo('TSK')
export const generateOutRefundNo = () => buildNo('RF')
