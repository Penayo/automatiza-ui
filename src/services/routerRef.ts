import type { Router } from 'vue-router'

let _router: Router | null = null

export function setRouter(r: Router) {
  _router = r
}

export function navigateTo(path: string) {
  if (_router) {
    _router.push(path)
  } else {
    // fallback: router not yet initialized (should not happen after app mount)
    window.location.href = path
  }
}
