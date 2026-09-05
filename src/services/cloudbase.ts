import cloudbase from '@cloudbase/js-sdk'

const envId = import.meta.env.VITE_CLOUDBASE_ENV_ID?.trim()
const publishableKey = import.meta.env.VITE_CLOUDBASE_PUBLISHABLE_KEY?.trim()
const region = import.meta.env.VITE_CLOUDBASE_REGION?.trim()

export const cloudbaseApp = envId && publishableKey
  ? cloudbase.init({
      env: envId,
      accessKey: publishableKey,
      persistence: 'local',
      ...(region ? { region } : {}),
    })
  : null

export function requireCloudbaseApp() {
  if (!cloudbaseApp) {
    throw new Error(
      'CloudBase 未配置，请检查 VITE_CLOUDBASE_ENV_ID 和 VITE_CLOUDBASE_PUBLISHABLE_KEY。',
    )
  }
  return cloudbaseApp
}

export function requireCloudbaseAuth() {
  return requireCloudbaseApp().auth
}

export function requireCloudbaseDatabase() {
  return requireCloudbaseApp().rdb()
}
