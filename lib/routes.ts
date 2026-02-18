import type { Route } from "next";

function asRoute(path: string): Route {
  return path as Route;
}

export const routes = {
  home: (): Route => asRoute("/"),
  explore: (): Route => asRoute("/explore"),
  watchHub: (): Route => asRoute("/watch"),
  listenHub: (): Route => asRoute("/listen"),
  readHub: (): Route => asRoute("/read"),
  liveNow: (): Route => asRoute("/live-now"),
  worlds: (): Route => asRoute("/worlds"),
  world: (worldId: string): Route => asRoute(`/worlds/${worldId}`),
  worldDrops: (worldId: string): Route => asRoute(`/worlds/${worldId}/drops`),
  studio: (handle: string): Route => asRoute(`/studios/${handle}`),
  drop: (dropId: string): Route => asRoute(`/drops/${dropId}`),
  dropDetails: (dropId: string): Route => asRoute(`/drops/${dropId}/details`),
  dropProperties: (dropId: string): Route => asRoute(`/drops/${dropId}/properties`),
  dropOffers: (dropId: string): Route => asRoute(`/drops/${dropId}/offers`),
  dropActivity: (dropId: string): Route => asRoute(`/drops/${dropId}/activity`),
  dropPreview: (dropId: string): Route => asRoute(`/drops/${dropId}/preview`),
  dropPreviewPhotos: (dropId: string): Route => asRoute(`/drops/${dropId}/preview/photos`),
  dropWatch: (dropId: string): Route => asRoute(`/drops/${dropId}/watch`),
  dropListen: (dropId: string): Route => asRoute(`/drops/${dropId}/listen`),
  dropRead: (dropId: string): Route => asRoute(`/drops/${dropId}/read`),
  dropPhotos: (dropId: string): Route => asRoute(`/drops/${dropId}/photos`),
  buyDrop: (dropId: string): Route => asRoute(`/pay/buy/${dropId}`),
  myCollection: (): Route => asRoute("/my-collection"),
  library: (): Route => asRoute("/library"),
  spaceSetup: (): Route => asRoute("/space-setup"),
  signIn: (returnTo?: string): Route =>
    returnTo
      ? asRoute(`/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`)
      : asRoute("/auth/sign-in"),
  signUp: (): Route => asRoute("/auth/sign-up"),
  logout: (): Route => asRoute("/logout"),
  workshop: (): Route => asRoute("/workshop"),
  certificate: (certificateId: string): Route => asRoute(`/certificates/${certificateId}`)
};

export type AppRouteHelpers = typeof routes;
