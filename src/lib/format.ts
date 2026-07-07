// 숫자를 한국 주식 화면에 맞는 천 단위 표기로 바꾼다.
export function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(Math.abs(value));
}

// 등락률은 부호 없이 소수 둘째 자리까지 표시한다.
export function formatRate(value: number) {
  return `${Math.abs(value).toFixed(2)}%`;
}

// 가격 등락 상태에 맞는 CSS 클래스를 반환한다.
export function getChangeClass(value: number) {
  if (value > 0) return "is-up";
  if (value < 0) return "is-down";
  return "is-flat";
}
