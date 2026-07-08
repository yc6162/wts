import { io, type Socket } from "socket.io-client";
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

// 앱 시작 뒤 한 번만 연결하고, 화면별 구독만 바꾸는 RTS 클라이언트다.
class RealtimeClient {
  private socket: Socket | null = null;
  private handlers = new Map<string, RealtimeHandler>();
  private subscriptions = new Map<string, RtsSubscription>();
  private activeCode = "005930";
  private connected = false;
  private loginReady = false;
  private loginId = "";
  private lastUploadedSid = "";

  // 공통 RTS 연결을 시작한다. env의 https URL을 그대로 사용한다.
  connect(loginId = "") {
    const url = process.env.NEXT_PUBLIC_RTS_URL;
    this.loginId = loginId;

    if (!url) {
      console.log("[WTS][RTS] url empty. realtime disabled");
      return;
    }

    if (this.socket) {
      console.log("[WTS][RTS] already connected or connecting");
      return;
    }

    console.log("[WTS][RTS] connect start", { url, loginId });
    this.socket = io(url, {
      transports: ["websocket"],
      secure: url.startsWith("https"),
      reconnection: true,
      forceNew: true
    });

    this.bindSocketEvents();
  }

  // 화면이 사라지면 공통 연결을 정리한다.
  disconnect() {
    console.log("[WTS][RTS] disconnect");
    this.socket?.disconnect();
    this.socket = null;
    this.connected = false;
    this.loginReady = false;
    this.lastUploadedSid = "";
    this.handlers.clear();
    this.subscriptions.clear();
  }

  // 탭별 실시간 수신 콜백을 등록한다.
  subscribe(key: string, code: string, handler: RealtimeHandler) {
    const subscription = createSubscription(key, code);

    console.log("[WTS][RTS] subscribe", { key: subscription.key, code: subscription.code, pName: subscription.pName });
    this.activeCode = code;
    this.handlers.set(key, handler);
    this.subscriptions.set(key, subscription);
    this.sendPushOn(subscription);
  }

  // 이전 탭의 실시간 연동을 해지한다.
  unsubscribe(key: string) {
    const subscription = this.subscriptions.get(key);

    console.log("[WTS][RTS] unsubscribe", {
      key,
      code: subscription?.code,
      pName: subscription?.pName
    });
    this.handlers.delete(key);
    this.subscriptions.delete(key);

    if (subscription) {
      this.sendPushOff(subscription);
    }
  }

  // socket.io 서버 이벤트를 RTS 순서에 맞춰 묶는다.
  private bindSocketEvents() {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      const sid = this.socket?.id ?? "";
      this.connected = true;
      console.log("[WTS][RTS] sid received", { sid });
      this.sendSidAndLogin(sid);
    });

    this.socket.on("sid", (sid) => {
      console.log("[WTS][RTS] sid event", { sid });
      this.sendSidAndLogin(String(sid ?? ""));
    });

    this.socket.on("login", (data) => {
      console.log("[WTS][RTS] login", data);
      if (data === "OK") {
        this.loginReady = true;
        this.resubscribeAll();
      }
    });

    this.socket.on("MSGID", (data) => {
      console.log("[WTS][RTS] MSGID", data);
      if (data === "RTMREADY") {
        this.socket?.emit("hello", "push1");
        this.connected = true;
      }
    });

    this.socket.on("disconnect", (reason) => {
      console.log("[WTS][RTS] disconnected", { reason });
      this.connected = false;
      this.loginReady = false;
    });

    this.socket.on("connect_error", (error) => {
      console.log("[WTS][RTS] connect_error", error.message);
      this.connected = false;
      this.loginReady = false;
    });

    this.socket.on("push", (data) => this.handlePushPacket(data));
    this.socket.on("tr", (data) => this.handlePushPacket(data));
    this.socket.on("tick", (data) => this.handlePushPacket(data));
  }

  // sid를 서버에 되돌려 알리고 로그인 요청을 보낸다.
  private sendSidAndLogin(sid: string) {
    if (!this.socket) return;
    if (sid && this.lastUploadedSid === sid) return;

    if (sid) {
      this.lastUploadedSid = sid;
      this.socket.emit("sid", sid);
      console.log("[WTS][RTS] sid upload", { sid });
    }

    this.socket.emit("mbrLogin", this.loginId);
    console.log("[WTS][RTS] mbrLogin", { loginId: this.loginId });
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

  // 로그인 이후 기존 탭 구독을 다시 서버에 등록한다.
  private resubscribeAll() {
    console.log("[WTS][RTS] resubscribe", { count: this.subscriptions.size });
    this.subscriptions.forEach((subscription) => this.sendPushOn(subscription));
  }

  // 기존 WTS 서버 프로토콜에 맞춰 pushON을 보낸다.
  private sendPushOn(subscription: RtsSubscription) {
    if (!this.connected || !this.loginReady || !this.socket) {
      console.log("[WTS][RTS] pushON pending", {
        key: subscription.key,
        connected: this.connected,
        loginReady: this.loginReady
      });
      return;
    }

    const packet = {
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
    };

    console.log("[WTS][RTS] pushON", { key: subscription.key, code: subscription.code, pName: subscription.pName });
    this.socket.emit("pushON", packet);
  }

  // 기존 WTS 서버 프로토콜에 맞춰 pushOFF를 보낸다.
  private sendPushOff(subscription: RtsSubscription) {
    if (!this.connected || !this.socket) {
      console.log("[WTS][RTS] pushOFF skipped", { key: subscription.key, connected: this.connected });
      return;
    }

    const packet = {
      reqGbn: "stok",
      svcc: subscription.pName,
      xWin: subscription.xWin,
      yWin: subscription.yWin
    };

    console.log("[WTS][RTS] pushOFF", { key: subscription.key, code: subscription.code, pName: subscription.pName });
    this.socket.emit("pushOFF", packet);
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
