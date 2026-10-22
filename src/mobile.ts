/**
 * 移动端检测：主输入为触摸（pointer: coarse + 有触点）或视口较窄时判定为移动端。
 * 带触摸屏的笔记本（主指针仍是鼠标，pointer:fine）不会被误判，保留桌面高画质。
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false
  const touch = (navigator.maxTouchPoints ?? 0) > 0
  const narrow = window.innerWidth < 820
  return (coarse && touch) || narrow
}
