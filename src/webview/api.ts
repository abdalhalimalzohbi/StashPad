import type { WebviewToHost } from '../messaging/protocol';

interface VsCodeApi {
  postMessage(msg: WebviewToHost): void;
  getState<T = unknown>(): T | undefined;
  setState<T>(state: T): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

const api = acquireVsCodeApi();

export function post(msg: WebviewToHost): void {
  api.postMessage(msg);
}
