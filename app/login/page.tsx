import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getSafeReturnTo } from "@/lib/redirect"
import { EmailLoginForm } from "./_components/email-login-form"
import { OAuthButton } from "./_components/oauth-button"
import { PhoneLoginForm } from "./_components/phone-login-form"
import { WechatLoginButton } from "./_components/wechat-login-button"

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
  const hasSms = !!(process.env.ALIYUN_SMS_ACCESS_KEY && process.env.ALIYUN_SMS_SECRET)
  const wechatAppid = process.env.NEXT_PUBLIC_WECHAT_APPID
  const accountsUrl = process.env.NEXT_PUBLIC_ACCOUNTS_URL || process.env.AUTH_URL || ""
  const hasWechat = !!wechatAppid

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              {region === "CN" ? "欢迎回来" : "Welcome back"}
            </h1>
            <p className="text-gray-500 mt-2">
              {region === "CN" ? "登录以继续" : "Sign in to continue"}
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-xl shadow-gray-200/50">
            {region === "CN" ? (
              <>
                {hasSms ? (
                  <PhoneLoginForm returnTo={returnTo} />
                ) : hasEmail ? (
                  <EmailLoginForm returnTo={returnTo} region={region} />
                ) : null}

                {hasWechat && (
                  <>
                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200" />
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-white text-gray-500">或</span>
                      </div>
                    </div>
                    <WechatLoginButton returnTo={returnTo} appid={wechatAppid!} accountsUrl={accountsUrl} />
                  </>
                )}

                {!hasSms && !hasEmail && !hasWechat && (
                  <p className="text-center text-gray-500 text-sm">
                    请配置登录方式（手机号 / 微信 / Email）
                  </p>
                )}
              </>
            ) : (
              <>
                {hasEmail && <EmailLoginForm returnTo={returnTo} region={region} />}

                {(hasGoogle || hasGitHub) && (
                  <>
                    {hasEmail && (
                      <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="px-4 bg-white text-gray-500">or</span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      {hasGoogle && (
                        <OAuthButton provider="google" label="Continue with Google" returnTo={returnTo} />
                      )}
                      {hasGitHub && (
                        <OAuthButton provider="github" label="Continue with GitHub" returnTo={returnTo} />
                      )}
                    </div>
                  </>
                )}

                {!hasEmail && !hasGoogle && !hasGitHub && (
                  <p className="text-center text-gray-500 text-sm">
                    Please configure login methods (Email / Google / GitHub)
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <footer className="py-6 text-center text-sm text-gray-400">
        <p>&copy; {new Date().getFullYear()} Go2Auth</p>
      </footer>
    </div>
  )
}
