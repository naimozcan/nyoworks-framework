# @nyoworks/feature-auth-social

Social authentication feature for NYOWORKS projects. Supports OAuth integration with Google, Apple, and GitHub.

## Installation

```bash
pnpm add @nyoworks/feature-auth-social
```

## Environment Variables

Configure the following environment variables for each provider you want to use:

### Google OAuth

```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

Get credentials from [Google Cloud Console](https://console.cloud.google.com/apis/credentials).

Required OAuth scopes:
- `openid`
- `email`
- `profile`

### Apple Sign In

```bash
APPLE_CLIENT_ID=your-apple-client-id
APPLE_CLIENT_SECRET=your-apple-client-secret
```

Get credentials from [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers/list/serviceId).

Required OAuth scopes:
- `name`
- `email`

Note: Apple Client Secret requires generating a JWT signed with your private key.

### GitHub OAuth

```bash
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

Get credentials from [GitHub Developer Settings](https://github.com/settings/developers).

Required OAuth scopes:
- `read:user`
- `user:email`

## Usage

### Database Schema

Add the social accounts table to your database:

```typescript
import { socialAccounts } from "@nyoworks/feature-auth-social/schema"

export const schema = {
  ...socialAccounts,
}
```

### tRPC Router

Add the auth social router to your tRPC setup:

```typescript
import { authSocialRouter } from "@nyoworks/feature-auth-social/router"

export const appRouter = router({
  authSocial: authSocialRouter,
})
```

### React Hooks

Use the provided hooks in your components:

```tsx
import { useSocialLogin, useSocialAccounts, useUnlinkAccount } from "@nyoworks/feature-auth-social"

function LoginPage() {
  const { loginWithGoogle, loginWithGitHub, isLoading } = useSocialLogin({
    redirectUri: "https://yourapp.com/auth/callback",
    onSuccess: (result) => {
      console.log("Logged in:", result.user)
    },
  })

  return (
    <div>
      <button onClick={loginWithGoogle} disabled={isLoading}>
        Continue with Google
      </button>
      <button onClick={loginWithGitHub} disabled={isLoading}>
        Continue with GitHub
      </button>
    </div>
  )
}

function AccountSettings() {
  const { accounts, isLinked } = useSocialAccounts()
  const { unlink, isLoading } = useUnlinkAccount()

  return (
    <div>
      <h3>Linked Accounts</h3>
      {accounts.map((account) => (
        <div key={account.id}>
          {account.provider}: {account.profile?.email}
          <button onClick={() => unlink(account.provider)} disabled={isLoading}>
            Unlink
          </button>
        </div>
      ))}
    </div>
  )
}
```

## OAuth Callback Handling

Handle the OAuth callback in your callback page:

```tsx
import { useSocialLogin } from "@nyoworks/feature-auth-social"
import { useSearchParams, useRouter } from "next/navigation"
import { useEffect } from "react"

function AuthCallback() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { handleCallback } = useSocialLogin({
    redirectUri: "https://yourapp.com/auth/callback",
    onSuccess: () => router.push("/dashboard"),
    onError: () => router.push("/login?error=auth_failed"),
  })

  useEffect(() => {
    const code = searchParams.get("code")
    const state = searchParams.get("state")

    if (code && state) {
      handleCallback(code, state)
    }
  }, [searchParams, handleCallback])

  return <div>Authenticating...</div>
}
```

## API Routes (Next.js)

Example API route implementations:

```typescript
// app/api/auth/social/oauth-url/route.ts
import { getOAuthUrl } from "@nyoworks/feature-auth-social"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const provider = searchParams.get("provider")
  const redirectUri = searchParams.get("redirectUri")

  const result = getOAuthUrl({ provider, redirectUri })
  return Response.json(result)
}

// app/api/auth/social/login/route.ts
import { authSocialRouter } from "@nyoworks/feature-auth-social/router"

export async function POST(request: Request) {
  const body = await request.json()
  // Handle with tRPC caller
}
```

## Security Considerations

1. Always validate the `state` parameter to prevent CSRF attacks
2. Store tokens securely and encrypt them at rest
3. Use HTTPS for all redirect URIs
4. Implement token refresh logic for long-lived sessions
5. Revoke tokens when users unlink accounts

## License

MIT
