import { BackendError, toBackendError } from './errors'

export function normalizeRpcResponse(response: unknown, rpcName: string): unknown {
  if (response == null) return null
  if (typeof response !== 'string') return response
  const trimmed = response.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return response
  try {
    return JSON.parse(trimmed)
  } catch (original) {
    throw new BackendError(`RPC ${rpcName} 返回了无效的 JSON。`, {
      code: 'INVALID_RPC_RESPONSE', kind: 'unknown', original,
      details: `rpc: ${rpcName}`,
    })
  }
}

interface RpcResponse { data: unknown; error: unknown }
type RpcRequest = PromiseLike<RpcResponse> & { fetch?: typeof fetch }

export async function runCloudbaseRpc(request: RpcRequest, rpcName: string): Promise<RpcResponse> {
  // CloudBase's PostgREST builder parses text unconditionally. Intercept only
  // this request's transport, before that parser, without repeating the RPC.
  let normalized: unknown
  let captured = false
  let normalizationError: unknown
  if (typeof request.fetch === 'function') {
    const transport = request.fetch
    request.fetch = async (...args) => {
      const response = await transport(...args)
      if (!response.ok) return response
      return new Proxy(response, {
        get(target, key) {
          if (key === 'text') return async () => {
            try {
              normalized = normalizeRpcResponse(await target.text(), rpcName)
              captured = true
              return JSON.stringify(normalized)
            } catch (error) {
              normalizationError = error
              throw error
            }
          }
          const value = Reflect.get(target, key, target)
          return typeof value === 'function' ? value.bind(target) : value
        },
      })
    }
  }
  try {
    const response = await request
    // The SDK can turn a thrown parser error into response.error.
    if (normalizationError) throw normalizationError
    if (response.error) return response
    return { ...response, data: captured ? normalized : normalizeRpcResponse(response.data, rpcName) }
  } catch (error) {
    throw toBackendError(normalizationError ?? error, { operation: `RPC ${rpcName}` })
  }
}
