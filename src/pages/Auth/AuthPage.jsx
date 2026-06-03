import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { buildAuthorityUrl } from "../../lib/apiUrl.js";
import "./AuthPage.css";

const OAUTH_MESSAGES = {
  unverified: "Your Google account's email isn't verified. Please register with email and password instead.",
  error: "Google sign-in was cancelled or failed. Please try again.",
  bad_state: "Google sign-in could not be verified. Please try again.",
  expired: "That Google sign-in expired. Please try again.",
  token_failed: "Google sign-in failed during token exchange. Please try again.",
  no_profile: "Google didn't return a usable profile. Please try again.",
  link_failed: "Could not complete Google sign-in. Please try again.",
};

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    captchaAnswer: ""
  });
  const [captcha, setCaptcha] = useState(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { login, register, user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("verified") === "true") {
      setSuccessMsg("Email verified! You can now log in.");
    }
    const oauth = searchParams.get("oauth");
    if (oauth === "link_required") {
      const email = searchParams.get("email");
      setError(`An account already exists for ${email || "that email"}. Sign in below, then link Google from your profile.`);
    } else if (oauth && OAUTH_MESSAGES[oauth]) {
      setError(OAUTH_MESSAGES[oauth]);
    }
  }, [searchParams]);

  const handleGoogleSignIn = () => {
    // Top-level navigation (not fetch) so the provider redirect works.
    window.location.href = buildAuthorityUrl("/auth/oauth/google");
  };

  useEffect(() => {
    if (!isLogin) {
      fetchCaptcha();
    }
  }, [isLogin]);

  const fetchCaptcha = async () => {
    try {
      const res = await fetch(buildAuthorityUrl('/auth/captcha'), { credentials: 'include' });
      const data = await res.json();
      setCaptcha(data);
    } catch (e) {
      console.error("Failed to load CAPTCHA");
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const validatePassword = (pwd) => {
    const rules = [
      { regex: /.{8,}/, msg: "8+ chars" },
      { regex: /[A-Z]/, msg: "1 uppercase" },
      { regex: /[a-z]/, msg: "1 lowercase" },
      { regex: /[0-9]/, msg: "1 number" },
      { regex: /[^A-Za-z0-9]/, msg: "1 special char" }
    ];
    return rules.map(r => ({ msg: r.msg, valid: r.regex.test(pwd) }));
  };

  const passwordRules = validatePassword(formData.password);

  const validate = () => {
    if (!formData.username || formData.username.length < 3) {
      return "Username must be at least 3 characters.";
    }
    if (!isLogin && (!formData.email || !formData.email.includes("@"))) {
      return "Valid email is required.";
    }
    if (formData.password.length < 8) {
      return "Password must be at least 8 characters.";
    }
    if (!isLogin) {
      if (formData.password !== formData.confirmPassword) {
        return "Passwords do not match.";
      }
      if (!passwordRules.every(r => r.valid)) {
        return "Password does not meet complexity requirements.";
      }
      if (!formData.captchaAnswer) {
        return "Please solve the security challenge.";
      }
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const res = await login(formData.username, formData.password);
        if (res.success) {
          navigate("/watch");
        } else {
          setError(res.message);
        }
      } else {
        const res = await register(
          formData.username, 
          formData.email, 
          formData.password, 
          captcha.id, 
          formData.captchaAnswer
        );
        if (res.success) {
          setIsLogin(true);
          setSuccessMsg("Registration successful! Check your email to verify your account.");
          setFormData({ ...formData, password: "", confirmPassword: "", captchaAnswer: "" });
        } else {
          setError(res.message);
          fetchCaptcha(); // Refresh captcha on failure
        }
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <section className="section min-h-screen auth-page">
        <div className="container auth-container">
          <div className="glass-strong p-12 rounded-2xl text-center">
            <h1 className="title mb-4">Aetheric Resonance Identified</h1>
            <p className="subtitle mb-8">Greetings, <strong>{user.username}</strong>. Your essence is synchronized with the Scholomance.</p>
            <div className="flex flex-col gap-4 max-w-xs mx-auto">
              <button className="btn btn-primary" onClick={() => navigate("/watch")}>Enter Inner Sanctum</button>
              <button className="btn btn-secondary" onClick={logout}>Sever Connection (Logout)</button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section min-h-screen auth-page">
      <div className="container auth-container">
        <motion.div 
          className="auth-card glass-strong"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <header className="auth-header">
            <div className="kicker">Identity Manifest</div>
            <h1 className="title">{isLogin ? "Synchronize essence" : "Initialize Identity"}</h1>
            <p className="text-muted">
              {isLogin 
                ? "Enter your credentials to resume your journey." 
                : "Create a new vessel for your progress through the schools."}
            </p>
          </header>

          <div className="auth-oauth mt-8">
            <button
              type="button"
              className="btn btn-secondary w-full auth-oauth-btn"
              onClick={handleGoogleSignIn}
            >
              <GoogleGlyph /> Continue with Google
            </button>
            <div className="auth-divider">
              <span>or {isLogin ? "sign in" : "register"} with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="field-group">
              <label htmlFor="username">Initiate Name</label>
              <input
                id="username"
                name="username"
                type="text"
                className="input"
                autoComplete="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="Username"
              />
            </div>

            {!isLogin && (
              <div className="field-group mt-4">
                <label htmlFor="email">Aetheric Mail</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="input"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="email@scholomance.ai"
                />
              </div>
            )}

            <div className="field-group mt-4">
              <label htmlFor="password">Security Cipher</label>
              <input
                id="password"
                name="password"
                type="password"
                className="input"
                autoComplete={isLogin ? "current-password" : "new-password"}
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••"
              />
              {!isLogin && formData.password && (
                <div className="password-strength mt-2 grid grid-cols-3 gap-1">
                  {passwordRules.map((rule, i) => (
                    <span key={i} className={`text-[0.6rem] px-1 rounded ${rule.valid ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                      {rule.msg}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {!isLogin && (
              <>
                <div className="field-group mt-4">
                  <label htmlFor="confirmPassword">Confirm Cipher</label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    className="input"
                    autoComplete="new-password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                  />
                </div>

                <div className="field-group mt-4">
                  <label htmlFor="captchaAnswer">Security Challenge: {captcha ? captcha.text : "Loading..."}</label>
                  <div className="flex gap-2">
                    <input
                      id="captchaAnswer"
                      name="captchaAnswer"
                      type="text"
                      className="input"
                      value={formData.captchaAnswer}
                      onChange={handleInputChange}
                      placeholder="Answer"
                    />
                    <button type="button" onClick={fetchCaptcha} className="btn btn-icon btn-secondary" title="Refresh Challenge">↻</button>
                  </div>
                </div>
              </>
            )}

            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  className="auth-error"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                >
                  {error}
                </motion.div>
              )}
              {successMsg && (
                <motion.div 
                  className="auth-success"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                >
                  {successMsg}
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              type="submit" 
              className="btn btn-primary w-full mt-8" 
              disabled={loading}
            >
              {loading ? <span className="animate-pulse">Processing...</span> : (isLogin ? "Synchronize" : "Initialize")}
            </button>
          </form>

          <footer className="auth-footer mt-6 text-center">
            <button 
              type="button" 
              className="text-btn text-sm text-muted hover:text-primary transition-colors" 
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Need to initialize identity? Register here." : "Already have an essence? Log in."}
            </button>
          </footer>
        </motion.div>
      </div>
    </section>
  );
}
