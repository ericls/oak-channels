import {
  RouteParams,
  RouterContext,
  State,
  testing,
} from "https://deno.land/x/oak@v9.0.0/mod.ts";
import { MockContextOptions } from "https://deno.land/x/oak@v9.0.0/testing.ts";

export class MockWebsocket extends EventTarget implements WebSocket {
  closeCode?: number;
  closeReason?: string;
  binaryType: BinaryType = "blob";
  readonly extensions: string = "";
  protocol = "";
  readyState = WebSocket.CONNECTING;
  url: string = "";
  bufferedAmount = 0;
  onclose: ((this: WebSocket, ev: CloseEvent) => any) | null = null;
  onerror: ((this: WebSocket, ev: Event | ErrorEvent) => any) | null = null;
  onmessage: ((this: WebSocket, ev: MessageEvent) => any) | null = null;
  onopen: ((this: WebSocket, ev: Event) => any) | null = null;
  close = (code?: number, reason?: string) => {
    this.readyState = this.CLOSED;
    this.closeCode = code;
    this.closeReason = reason;
  };
  send = (data: string | ArrayBufferLike | Blob | ArrayBufferView) => {
    this.dispatchEvent(new MessageEvent("message", { data }));
  };
  addEventListener: WebSocket["addEventListener"] = (...args: Parameters<WebSocket["addEventListener"]>) => {
    super.addEventListener(...args);
  }
  get CLOSED() {
    return WebSocket.CLOSED;
  }

  get CLOSING() {
    return WebSocket.CLOSING;
  }

  get CONNECTING() {
    return WebSocket.CONNECTING;
  }

  get OPEN() {
    return WebSocket.OPEN;
  }
}

export function createWebsocketMockContext<
  P extends RouteParams = RouteParams,
  S extends State = Record<string, any>,
>(
  {
    app,
    ip = "127.0.0.1",
    method = "GET",
    params,
    path = "/",
    state,
  }: MockContextOptions = {},
) {
  const context: RouterContext<P> & {websocket?: MockWebsocket, isUpgradable: boolean} = testing.createMockContext<P, S>({
    app,
    ip,
    method,
    params,
    path,
    state,
  });
  (context.isUpgradable as boolean) = true;
  context.upgrade = async () => {
    const ws = new MockWebsocket();
    ws.url = path;
    context.websocket = ws;
    return ws;
  };
  return context
}
