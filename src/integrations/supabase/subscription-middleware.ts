import { createMiddleware } from '@tanstack/react-start'

export const requireActiveSubscription = createMiddleware({
  type: 'function',
}).server(async ({ next, context }) => {
  const ctx = context as unknown as {
    supabase: { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> }
    userId: string
  }

  const { supabase, userId } = ctx

  const { data, error } = await supabase.rpc('has_access', {
    _user_id: userId,
  })

  if (error) {
    console.error('[Subscription] Vérification impossible:', error)
    throw new Error('Impossible de vérifier votre abonnement.')
  }

  if (data !== true) {
    throw new Response(null, {
      status: 403,
      headers: {
        'X-Subscription-Required': 'true',
      },
    })
  }

  return next()
})