import { CODES, HttpError } from '../../utils/httpError.js'

/**
 * 订单状态机（本阶段未接入支付与配送，状态流转如下）。
 *
 *   PENDING ──accept──▶ PREPARING ──complete──▶ COMPLETED
 *      │                    │
 *      └──reject/cancel──▶ CANCELLED
 *
 * 禁止跨状态跳跃（例如 PENDING 直接 COMPLETED）。
 * 每次流转调用 assertTransition 校验前置状态，非法时抛出 409。
 */
export const ORDER_STATUS = {
  PENDING: 'PENDING',
  PREPARING: 'PREPARING',
  DELIVERING: 'DELIVERING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
}

/** 允许的流转：动作 -> 允许的前置状态集合 */
const TRANSITIONS = {
  accept: [ORDER_STATUS.PENDING],
  reject: [ORDER_STATUS.PENDING],
  complete: [ORDER_STATUS.PREPARING],
  cancel: [ORDER_STATUS.PENDING],
}

/** 终态：一旦进入不可再变更 */
const TERMINAL = new Set([ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED])

export function assertTransition(action, currentStatus) {
  const allowed = TRANSITIONS[action]
  if (!allowed) {
    throw new HttpError(400, CODES.PARAM, `未知的订单操作：${action}`)
  }
  if (TERMINAL.has(currentStatus)) {
    throw new HttpError(409, CODES.ORDER_STATUS, `订单已${currentStatus}，不可再操作`)
  }
  if (!allowed.includes(currentStatus)) {
    throw new HttpError(
      409,
      CODES.ORDER_STATUS,
      `订单当前状态 ${currentStatus} 不允许执行 ${action}`,
    )
  }
}
