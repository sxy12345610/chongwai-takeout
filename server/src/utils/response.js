/**
 * 统一成功响应：{ code, message, data, traceId }
 * traceId 取自 app.js 中注入的 X-Request-Id。
 */
export function sendOk(res, data, message = 'ok') {
  res.json({
    code: 0,
    message,
    data,
    traceId: res.getHeader('X-Request-Id'),
  })
}
