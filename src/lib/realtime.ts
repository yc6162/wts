import { io, type Socket } from "socket.io-client";
import { createMockOrderBook, createMockQuote } from "@/data/mockMarket";
import { normalizeRtsPacket } from "@/lib/rtsFid";
import type { RealtimeMessage } from "@/types/trading";

type RealtimeHandler = (message: RealtimeMessage) => void;

type RtsSubscription = {
  key: string;
  code: string;
  pName: string;
  xWin: string;
  yWin: number;
  symbols: string[];
};

const currentSymbols = ["002023", "002311", "002024", "002033", "002027", "002028", "002314"];
const orderBookSymbols = [
  "001022",
  "001382",
  "001380",
  "001384",
  "001383",
  "001386",
  "002023",
  "002024",
  "002033",
  "002027",
  "002314",
  "002028",
  "004040",
  "004060",
  "004059",
  "004058",
  "004057",
  "004056",
  "004050",
  "004049",
  "004048",
  "004047",
  "004046",
  "004071",
  "004072",
  "004073",
  "004074",
  "004075",
  "004061",
  "004062",
  "004063",
  "004064",
  "004065"
];

// 앱 시작 시 한 번만 연결되고, 화면별 구독만 바꾸는 RTS 클라이언트다.
class RealtimeClient {
  private socket: Socket | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private handlers = new Map<string, RealtimeHandler>();
  private subscriptions = new Map<string, RtsSubscription>();
  private activeCode = "005930";
  private connected = false;
  private loginId = "";

  // 공통 RTS 연결을 시작한다. env는 https URL 그대로 사용한다.
  connect(loginId = "") {
    const url = process.env.NEXT_PUBLIC_RTS_URL;
    this.loginId = loginId;

    if (url && !this.socket) {
      this.socket = io(url, {
        transports: ["websocket"],
        secure: url.startsWith("https"),
        reconnection: true,
        forceNew: true
      });

      this.socket.on("connect", () => {
        this.connected = true;
        this.stopMockFeed();
        setTimeout(() => this.socket?.emit("mbrLogin", this.loginId), 200);
      });

      this.socket.on("login", (data) => {
        if (data === "OK") {
          this.resubscribeAll();
        }
      });

      this.socket.on("disconnect", () => {
        this.connected = false;
        this.startMockFeed();
      });

      this.socket.on("connect_error", () => {
        this.connected = false;
        this.startMockFeed();
      });

      this.socket.on("push", (data) => this.handlePushPacket(data));
      this.socket.on("tr", (data) => this.handlePushPacket(data));
      this.socket.on("tick", (data) => this.handlePushPacket(data));
      return;
    }

    this.startMockFeed();
  }

  // 화면이 사라질 때 공통 연결을 정리한다.
  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.connected = false;
    this.stopMockFeed();
    this.handlers.clear();
    this.subscriptions.clear();
  }

  // 탭별 실시간 수신 콜백을 등록한다.
  subscribe(key: string, code: string, handler: RealtimeHandler) {
    const subscription = createSubscription(key, code);

    this.activeCode = code;
    this.handlers.set(key, handler);
    this.subscriptions.set(key, subscription);
    this.sendPushOn(subscription);
  }

  // 이전 탭의 실시간 연동을 해지한다.
  unsubscribe(key: string) {
    const subscription = this.subscriptions.get(key);

    this.handlers.delete(key);
    this.subscriptions.delete(key);

    if (subscription) {
      this.sendPushOff(subscription);
    }
  }

  // 서버 push 원본 패킷을 화면용 메시지로 변환해서 배포한다.
  private handlePushPacket(raw: unknown) {
    if (!raw || typeof raw !== "object") return;

    const messages = normalizeRtsPacket(raw as Record<string, unknown>);

    messages.forEach((message) => {
      if (message.code !== this.activeCode) return;
      this.handlers.forEach((handler) => handler(message));
    });
  }

  // 연결 직후 기존 탭 구독을 다시 서버에 등록한다.
  private resubscribeAll() {
    this.subscriptions.forEach((subscription) => this.sendPushOn(subscription));
  }

  // 기존 WTS 서버 프로토콜에 맞춰 pushON을 보낸다.
  private sendPushOn(subscription: RtsSubscription) {
    if (!this.connected || !this.socket) return;

    this.socket.emit("pushON", {
      reqGbn: "stok",
      svcc: subscription.pName,
      xWin: subscription.xWin,
      yWin: subscription.yWin,
      pName: subscription.pName,
      vName: subscription.key,
      key: "001301",
      keys: [],
      value: subscription.code,
      values: [subscription.code],
      symbols: subscription.symbols
    });
  }

  // 기존 WTS 서버 프로토콜에 맞춰 pushOFF를 보낸다.
  private sendPushOff(subscription: RtsSubscription) {
    if (!this.connected || !this.socket) return;

    this.socket.emit("pushOFF", {
      reqGbn: "stok",
      svcc: subscription.pName,
      xWin: subscription.xWin,
      yWin: subscription.yWin
    });
  }

  // 개발용 mock feed를 멈춘다.
  private stopMockFeed() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
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

// 화면 key에 맞는 RTS 서비스와 FID 목록을 만든다.
function createSubscription(key: string, code: string): RtsSubscription {
  const isOrderBook = key.startsWith("orderbook");

  return {
    key,
    code,
    pName: isOrderBook ? "0102" : "0101",
    xWin: isOrderBook ? "B" : "A",
    yWin: isOrderBook ? 1 : 0,
    symbols: isOrderBook ? orderBookSymbols : currentSymbols
  };
}

export const realtimeClient = new RealtimeClient();
