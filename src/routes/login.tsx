import { FormEvent, useState } from "react";

import { useNavigate, createFileRoute } from "@tanstack/react-router";

import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Loader2,
  LogIn,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const BRAND = {
  purple: "#823292",
  purpleLight: "#A94FBC",
  background: "#0A0A0C",
  card: "#111114",
  border: "#27272A",
};

const FONT_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Montserrat:wght@400;500;600;700;800&display=swap');
`;

function LoginPage() {
  const { lang, dir } = useI18n();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (
    e: FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError(
        lang === "ar"
          ? "يرجى إدخال البريد الإلكتروني وكلمة المرور"
          : "Please enter your email and password",
      );
      return;
    }

    setLoading(true);

    try {
      const { error } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (error) {
        console.error(error);

        const errorMessage = error.message.toLowerCase();

        const isUnconfirmed =
          errorMessage.includes("email not confirmed") ||
          errorMessage.includes("email_not_confirmed");

        setError(
          isUnconfirmed
            ? lang === "ar"
              ? "الحساب غير مُفعّل. افتح رسالة تأكيد البريد الإلكتروني أولًا."
              : "Your account is not confirmed. Check your email first."
            : lang === "ar"
              ? "البريد الإلكتروني أو كلمة المرور غير صحيحة"
              : "Invalid email or password",
        );

        return;
      }

      await navigate({
        to: "/",
      });
    } catch (error) {
      console.error(error);

      setError(
        lang === "ar"
          ? "حدث خطأ غير متوقع. حاول مرة أخرى."
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{FONT_STYLES}</style>

      <main
        dir={dir}
        className="
          relative
          flex
          min-h-screen
          items-center
          justify-center
          overflow-hidden
          bg-[#0A0A0C]
          px-4
          py-10
          text-white
        "
        style={{
          fontFamily: '"Cairo", sans-serif',
        }}
      >
        {/* Background Glow */}

        <div
          className="
            pointer-events-none
            absolute
            -left-32
            -top-32
            h-96
            w-96
            rounded-full
            blur-3xl
          "
          style={{
            backgroundColor:
              "rgba(130,50,146,0.14)",
          }}
        />

        <div
          className="
            pointer-events-none
            absolute
            -bottom-40
            -right-40
            h-96
            w-96
            rounded-full
            blur-3xl
          "
          style={{
            backgroundColor:
              "rgba(130,50,146,0.10)",
          }}
        />

        {/* Login Card */}

        <div
          className="
            relative
            z-10
            w-full
            max-w-md
            rounded-2xl
            border
            p-6
            shadow-2xl
            sm:p-8
          "
          style={{
            backgroundColor: BRAND.card,
            borderColor: BRAND.border,
            boxShadow:
              "0 25px 80px rgba(0,0,0,0.45)",
          }}
        >
          {/* Brand */}

          <div className="mb-8 text-center">
            <div className="mb-5 flex justify-center">
              <div
                className="
                  flex
                  h-auto
                  w-60
                  items-center
                  justify-center
                  overflow-hidden
                  
                
                "
              
              >
                {/* 
                  ضع صورة الـ PNG داخل مجلد public
                  ثم غيّر المسار هنا فقط.

                  مثال:
                  src="/sodfa-logo.png"
                */}

                <img
                  src="/logo-login.png"
                  alt="SODFA"
                  className="
                    h-full
                    w-full
                    object-contain
                    p-2
                  "
                />
              </div>
            </div>

          

      

            <div
              className="
                mx-auto
                mt-5
                h-[2px]
                w-10
                rounded-full
              "
              style={{
                backgroundColor: BRAND.purple,
              }}
            />

            <h2 className="mt-6 text-xl font-bold">
              {lang === "ar"
                ? "تسجيل الدخول"
                : "Sign in"}
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              {lang === "ar"
                ? "سجل الدخول للوصول إلى لوحة التحكم"
                : "Sign in to access your dashboard"}
            </p>
          </div>

          {/* Error */}

          {error && (
            <div
              className="
                mb-5
                rounded-xl
                border
                px-4
                py-3
                text-center
                text-sm
              "
              style={{
                backgroundColor:
                  "rgba(239,68,68,0.08)",
                borderColor:
                  "rgba(239,68,68,0.2)",
                color: "#F87171",
              }}
            >
              {error}
            </div>
          )}

          {/* Form */}

          <form
            onSubmit={handleLogin}
            className="space-y-5"
          >
            {/* Email */}

            <div>
              <label
                htmlFor="email"
                className="
                  mb-2
                  block
                  text-sm
                  font-semibold
                  text-zinc-300
                "
              >
                {lang === "ar"
                  ? "البريد الإلكتروني"
                  : "Email"}
              </label>

              <div className="relative">
                <Mail
                  className="
                    absolute
                    start-3
                    top-1/2
                    h-5
                    w-5
                    -translate-y-1/2
                    text-zinc-500
                  "
                />

                <input
                  id="email"
                  type="email"
                  value={email}
                  disabled={loading}
                  autoComplete="email"
                  dir="ltr"
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder={
                    lang === "ar"
                      ? "أدخل البريد الإلكتروني"
                      : "Enter your email"
                  }
                  className="
                    h-12
                    w-full
                    rounded-xl
                    border
                    bg-[#0A0A0C]
                    px-11
                    text-sm
                    text-white
                    outline-none
                    placeholder:text-zinc-600
                    focus:border-[#823292]
                    focus:ring-2
                    focus:ring-[#823292]/20
                  "
                  style={{
                    borderColor: BRAND.border,
                  }}
                />
              </div>
            </div>

            {/* Password */}

            <div>
              <label
                htmlFor="password"
                className="
                  mb-2
                  block
                  text-sm
                  font-semibold
                  text-zinc-300
                "
              >
                {lang === "ar"
                  ? "كلمة المرور"
                  : "Password"}
              </label>

              <div className="relative">
                <Lock
                  className="
                    absolute
                    start-3
                    top-1/2
                    h-5
                    w-5
                    -translate-y-1/2
                    text-zinc-500
                  "
                />

                <input
                  id="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  disabled={loading}
                  autoComplete="current-password"
                  dir="ltr"
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder={
                    lang === "ar"
                      ? "أدخل كلمة المرور"
                      : "Enter your password"
                  }
                  className="
                    h-12
                    w-full
                    rounded-xl
                    border
                    bg-[#0A0A0C]
                    px-11
                    pe-12
                    text-sm
                    text-white
                    outline-none
                    placeholder:text-zinc-600
                    focus:border-[#823292]
                    focus:ring-2
                    focus:ring-[#823292]/20
                  "
                  style={{
                    borderColor: BRAND.border,
                  }}
                />

                <button
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    setShowPassword(
                      (prev) => !prev,
                    )
                  }
                  className="
                    absolute
                    end-3
                    top-1/2
                    -translate-y-1/2
                    text-zinc-500
                    hover:text-white
                  "
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}

            <button
              type="submit"
              disabled={loading}
              className="
                flex
                h-12
                w-full
                items-center
                justify-center
                gap-2
                rounded-xl
                text-sm
                font-bold
                text-white
                transition-all
                hover:-translate-y-0.5
                hover:bg-[#A94FBC]
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
              style={{
                backgroundColor:
                  BRAND.purple,
                boxShadow:
                  "0 10px 30px rgba(130,50,146,0.20)",
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />

                  <span>
                    {lang === "ar"
                      ? "جاري تسجيل الدخول..."
                      : "Signing in..."}
                  </span>
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />

                  <span>
                    {lang === "ar"
                      ? "تسجيل الدخول"
                      : "Sign in"}
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Footer */}

          <div
            className="
              mt-8
              border-t
              pt-5
              text-center
            "
            style={{
              borderColor: BRAND.border,
            }}
          >
            <p className="text-[11px] text-zinc-600">
              SODFA Inventory Management System
            </p>
          </div>
        </div>
      </main>
    </>
  );
}