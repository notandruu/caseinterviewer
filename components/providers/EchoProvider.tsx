'use client'

import { EchoProvider as EchoSDKProvider } from '@merit-systems/echo-react-sdk'

export function EchoProvider({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_ECHO_APP_ID

  if (!appId) {
    console.error('NEXT_PUBLIC_ECHO_APP_ID is not defined')
    return <>{children}</>
  }

  return (
    <EchoSDKProvider config={{ appId }}>
      {children}
    </EchoSDKProvider>
  )
}
