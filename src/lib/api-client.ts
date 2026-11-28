"use client";

import type { ChannelStatus, Prediction, PushStatus, ReportReason, Studio, Viewer } from "@/types";
import { apiRequest } from "./api-request";

export { ApiError } from "./api-request";

/** Запросы к API из браузера. Cookie сессии отправляется автоматически. */
function call<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method,
    credentials: "same-origin",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

type AuthResult = { token: string; user: Viewer };

export const api = {
  register: (data: { email: string; password: string; username: string; displayName: string }) =>
    call<AuthResult>("/api/auth/register", "POST", data),
  login: (data: { email: string; password: string }) => call<AuthResult>("/api/auth/login", "POST", data),
  logout: () => call<{ ok: true }>("/api/auth/logout", "POST", {}),
  forgotPassword: (email: string) => call<{ ok: true }>("/api/auth/password/forgot", "POST", { email }),
  resetPassword: (data: { email: string; code: string; password: string }) =>
    call<AuthResult>("/api/auth/password/reset", "POST", data),
  deleteAccount: (password: string) => call<{ ok: true }>("/api/me", "DELETE", { password }),

  follow: (slug: string) => call<{ isFollowing: boolean; followers: number }>(`/api/channels/${slug}/follow`, "PUT"),
  unfollow: (slug: string) => call<{ isFollowing: boolean; followers: number }>(`/api/channels/${slug}/follow`, "DELETE"),

  vote: (predictionId: string, outcomeId: string) =>
    call<{ prediction: Prediction }>(`/api/predictions/${predictionId}/vote`, "POST", { outcomeId }),
  report: (messageId: string, reason: ReportReason) => call<{ ok: true }>(`/api/chat/messages/${messageId}/report`, "POST", { reason }),
  deleteMessage: (messageId: string) => call<{ ok: true }>(`/api/chat/messages/${messageId}`, "DELETE"),
  block: (username: string) => call<{ ok: true }>(`/api/me/blocks/${username}`, "PUT"),
  unblock: (username: string) => call<{ ok: true }>(`/api/me/blocks/${username}`, "DELETE"),

  updateStudio: (settings: Studio["settings"]) => call<ChannelStatus>("/api/studio", "PATCH", settings),
  rotateStreamKey: () => call<{ streamKey: string }>("/api/studio/stream-key", "POST", {}),
  createPrediction: (data: { question: string; outcomes: string[]; durationSeconds: number }) =>
    call<{ prediction: Prediction }>("/api/studio/predictions", "POST", data),
  resolvePrediction: (id: string, outcomeId: string) =>
    call<{ prediction: Prediction }>(`/api/studio/predictions/${id}/resolve`, "POST", { outcomeId }),
  cancelPrediction: (id: string) => call<{ prediction: Prediction }>(`/api/studio/predictions/${id}/cancel`, "POST", {}),
  addMoment: (text: string) => call<{ moment: unknown }>("/api/studio/moments", "POST", { text }),
  ban: (username: string, minutes: number | null) => call<{ ok: true }>("/api/studio/bans", "POST", { username, minutes }),
  unban: (username: string) => call<{ ok: true }>(`/api/studio/bans/${username}`, "DELETE"),
  raid: (target: string) => call<{ ok: true; viewers: number }>("/api/studio/raid", "POST", { target }),

  resolveReport: (id: string, action: "dismiss" | "delete_message" | "ban_user") =>
    call<{ ok: true }>(`/api/admin/reports/${id}/resolve`, "POST", { action }),
  savePushKey: (data: { keyId: string; teamId: string; privateKey: string }) => call<PushStatus>("/api/admin/push", "PUT", data),
  testPush: () => call<{ devices: number; sent: number }>("/api/admin/push/test", "POST", {}),
};

/** Адрес WebSocket чата канала на том же домене. */
export function chatSocketUrl(slug: string): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/channels/${slug}/ws`;
}
