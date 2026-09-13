import { isTauri } from "@tauri-apps/api/core"
import { load } from "@tauri-apps/plugin-store"
import type { Store } from "@tauri-apps/plugin-store"

/**
 * On-device persistence exists only inside the Tauri shell (desktop and
 * mobile). The web build is always served against the backend, so there is
 * nothing to keep on the device and every call below is a no-op there.
 */
export function isNativeStoreAvailable() {
  return isTauri()
}

// `load` writes the file on first call, so each store file is opened once and
// the promise is shared by every reader and writer.
const openStores = new Map<string, Promise<Store>>()

function openStore(file: string) {
  let store = openStores.get(file)

  if (!store) {
    // autoSave off: saving is driven by the caller so a write is flushed at a
    // known point instead of on the plugin's own timer.
    store = load(file, { autoSave: false })
    openStores.set(file, store)
  }

  return store
}

export async function readNativeStore<T>(file: string, key: string) {
  if (!isNativeStoreAvailable()) {
    return null
  }

  const store = await openStore(file)

  return (await store.get<T>(key)) ?? null
}

export async function writeNativeStore<T>(file: string, key: string, value: T) {
  if (!isNativeStoreAvailable()) {
    return
  }

  const store = await openStore(file)
  await store.set(key, value)
  await store.save()
}
