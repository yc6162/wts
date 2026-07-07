import { createMockOrderBook, createMockQuote } from "@/data/mockMarket";
import type { RealtimeMessage } from "@/types/trading";

type RealtimeHandler = (message: RealtimeMessage) => void;

// 앱 시작 시 한 번만 연결되고, 화면별 구독만 바꾸는 RTS 클라이언트다.
class RealtimeClient {
  private socket: WebSocket | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private handlers = new Map<string, RealtimeHandler>();
  private activeCode = "005930";

  // 공통 RTS 연결을 시작한다.
  connect() {
    const url = process.env.NEXT_PUBLIC_RTS_URL;

    if (url && !this.socket) {
      this.socket = new WebSocket(url);
      this.socket.onmessage = (event) => this.handleSocketMessage(event.data);
      this.socket.onclose = () => {
        this.socket = null;
        this.startMockFeed();
      };
      return;
    }

    this.startMockFeed();
  }

  // 화면이 사라질 때 공통 연결을 정리한다.
  disconnect() {
    this.socket?.close();
    this.socket = null;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.handlers.clear();
  }

  // 탭별 실시간 수신 콜백을 등록한다.
  subscribe(key: string, code: string, handler: RealtimeHandler) {
    this.activeCode = code;
    this.handlers.set(key, handler);

    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ action: "subscribe", key, code }));
    }
  }

  // 이전 탭의 실시간 연동을 해지한다.
  unsubscribe(key: string) {
    this.handlers.delete(key);

    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ action: "unsubscribe", key }));
    }
  }

  // 서버에서 온 문자열 메시지를 공통 메시지 형태로 전달한다.
  private handleSocketMessage(raw: string) {
    try {
      const message = JSON.parse(raw) as RealtimeMessage;
      this.handlers.forEach((handler) => handler(message));
    } catch {
      // 잘못된 실시간 패킷은 화면을 멈추지 않도록 무시한다.
    }
  }

  // 개발 환경에서 실시간 흐름을 확인할 수 있는 간단한 mock feed다.
  private startMockFeed() {
    if (this.timer) return;

    this.timer = setInterval(() => {
      const quote = createMockQuote(this.activeCode);
      const tick = Math.round(Math.sin(Date.now() / 1400) * 500);
      const message: RealtimeMessage = {
        type: "quote",
        code: this.activeCode,
        payload: {
          ...quote,
          price: quote.price + tick,
          change: quote.change + tick,
          changeRate: Number((((quote.change + tick) / quote.open) * 100).toFixed(2)),
          tradeTime: new Date().toLocaleTimeString("ko-KR", { hour12: false })
        }
      };

      this.handlers.forEach((handler) => handler(message));

      if (Date.now() % 3 < 2) {
        this.handlers.forEach((handler) =>
          handler({ type: "orderbook", code: this.activeCode, payload: createMockOrderBook(this.activeCode) })
        );
      }
    }, 1500);
  }
}

export const realtimeClient = new RealtimeClient();
