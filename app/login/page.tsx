import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getSafeReturnTo } from "@/lib/redirect"
import { EmailLoginForm } from "./_components/email-login-form"
import { OAuthButton } from "./_components/oauth-button"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>
}) {
  const session = await auth()
  if (session?.user) {
    redirect("/account")
  }

  const params = await searchParams
  const returnTo = getSafeReturnTo(params.returnTo ?? null, "/account")
  const region = process.env.REGION || "GLOBAL"

  const hasEmail = !!(process.env.EMAIL_SERVER && process.env.EMAIL_FROM)
  const hasGoogle = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  const hasGitHub = !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-semibold text-center mb-6">登录</h1>

        {hasEmail && <EmailLoginForm returnTo={returnTo} />}

        {(hasGoogle || hasGitHub) && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">或</span>
              </div>
            </div>

            <div className="space-y-3">
              {region === "GLOBAL" && (
                <>
                  {hasGoogle && (
                    <OAuthButton provider="google" label="使用 Google 登录" returnTo={returnTo} />
                  )}
                  {hasGitHub && (
                    <OAuthButton provider="github" label="使用 GitHub 登录" returnTo={returnTo} />
                  )}
                </>
              )}

              {region === "CN" && (
                <p className="text-center text-gray-500 text-sm">
                  手机号 / 微信登录即将支持
                </p>
              )}
            </div>
          </>
        )}

        {!hasEmail && !hasGoogle && !hasGitHub && (
          <p className="text-center text-gray-500 text-sm">
            请配置登录方式（Email / Google / GitHub）
          </p>
        )}
      </div>
    </div>
  )
}
