import { useState } from "react";
import axios from "axios";
import "./index.css";

const API = `${import.meta.env.VITE_API_URL}/api/auth`;


export default function App() {
  const [step, setStep] = useState("home");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Signup: choose 2FA method
  const [otpMethod, setOtpMethod] = useState("AUTHENTICATOR");

  // OTP inputs
  const [otp, setOtp] = useState("");
  const [token, setToken] = useState("");
  const [msg, setMsg] = useState("");

  // Authenticator QR
  const [qr, setQr] = useState("");

  // Demo helpers (if SMTP not configured)
  const [demoOtp, setDemoOtp] = useState("");

  const resetMsg = () => setMsg("");

  const showError = (err) => {
    const apiMsg = err?.response?.data?.message;
    setMsg(apiMsg || err.message || "Something went wrong");
  };

  // -----------------
  // SIGNUP FLOW
  // -----------------
  const register = async () => {
    try {
      resetMsg();
      setDemoOtp("");
      setQr("");

      const res = await axios.post(`${API}/register`, {
        email,
        password,
        otpMethod,
      });

      setMsg(res.data.message || "Verification OTP sent to email");
      if (res.data.demoOtp) setDemoOtp(res.data.demoOtp);
      setStep("verify-email");
    } catch (err) {
      showError(err);
    }
  };

  const verifyEmail = async () => {
    try {
      resetMsg();
      const res = await axios.post(`${API}/verify-email`, { email, otp });
      setMsg(res.data.message || "Email verified");
      setOtp("");

      if (otpMethod === "AUTHENTICATOR") {
        setStep("setup-auth");
      } else {
        // Email 2FA: account becomes ACTIVE immediately
        setStep("login");
      }
    } catch (err) {
      showError(err);
    }
  };

  const setupAuthenticator = async () => {
    try {
      resetMsg();
      const res = await axios.post(`${API}/setup-authenticator`, { email });
      setQr(res.data.qrCodeDataURL);
      setMsg(res.data.message || "Scan QR in Google Authenticator");
      setStep("verify-auth");
    } catch (err) {
      showError(err);
    }
  };

  const verifyAuthenticatorForActivation = async () => {
    try {
      resetMsg();
      const res = await axios.post(`${API}/verify-authenticator`, {
        email,
        token: otp,
      });
      setMsg(res.data.message || "Account ACTIVE");
      setOtp("");
      setStep("login");
    } catch (err) {
      showError(err);
    }
  };

  // -----------------
  // LOGIN FLOW
  // -----------------
  const login = async () => {
    try {
      resetMsg();
      setDemoOtp("");
      const res = await axios.post(`${API}/login`, { email, password });

      if (res.data.method === "AUTHENTICATOR") {
        setMsg("Enter Authenticator OTP");
        setStep("login-auth");
      } else {
        setMsg(res.data.message || "OTP sent to email");
        if (res.data.demoOtp) setDemoOtp(res.data.demoOtp);
        setStep("login-email");
      }
    } catch (err) {
      showError(err);
    }
  };

  const verifyLoginAuthenticator = async () => {
    try {
      resetMsg();
      const res = await axios.post(`${API}/login/verify-authenticator`, {
        email,
        token: otp,
      });
      setToken(res.data.token);
      setOtp("");
      setStep("dashboard");
      setMsg("Logged in successfully");
    } catch (err) {
      showError(err);
    }
  };

  const verifyLoginEmail = async () => {
    try {
      resetMsg();
      const res = await axios.post(`${API}/login/verify-email`, {
        email,
        otp,
      });
      setToken(res.data.token);
      setOtp("");
      setStep("dashboard");
      setMsg("Logged in successfully");
    } catch (err) {
      showError(err);
    }
  };

  const logout = async () => {
    try {
      resetMsg();
      await axios.post(
        `${API}/logout`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setToken("");
      setStep("home");
      setMsg("Logged out");
    } catch (err) {
      showError(err);
    }
  };

  // -----------------
  // UI
  // -----------------

  const Icon = ({ name }) => {
    const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg" };
    if (name === "shield") {
      return (
        <svg {...common}>
          <path d="M12 2L20 5.5V11.5C20 16.5 16.6 20.9 12 22C7.4 20.9 4 16.5 4 11.5V5.5L12 2Z" stroke="currentColor" strokeWidth="1.7" />
          <path d="M8 12.2L10.6 14.8L16 9.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }
    if (name === "lock") {
      return (
        <svg {...common}>
          <path d="M7 11V8.5C7 5.5 9 3 12 3C15 3 17 5.5 17 8.5V11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M6.5 11H17.5C18.3 11 19 11.7 19 12.5V19C19 19.8 18.3 20.5 17.5 20.5H6.5C5.7 20.5 5 19.8 5 19V12.5C5 11.7 5.7 11 6.5 11Z" stroke="currentColor" strokeWidth="1.7" />
          <path d="M12 14.2V17.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    }
    if (name === "mail") {
      return (
        <svg {...common}>
          <path d="M4.5 7.5C4.5 6.7 5.2 6 6 6H18C18.8 6 19.5 6.7 19.5 7.5V17C19.5 17.8 18.8 18.5 18 18.5H6C5.2 18.5 4.5 17.8 4.5 17V7.5Z" stroke="currentColor" strokeWidth="1.7" />
          <path d="M5.2 7.2L12 12.3L18.8 7.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }
    return (
      <svg {...common}>
        <path d="M12 2V22" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  };

  return (
    <div className="app">
      <div className="shell">
        {/* Left: product/story */}
        <section className="hero">
          <div className="brand">
            <div className="logo" aria-hidden="true">
              <Icon name="shield" />
            </div>
            <div>
              <h1>SecureAuth</h1>
              <p className="sub">Cybersecurity Awareness Platform</p>
            </div>
          </div>

          <p className="kicker">
            A clean demo app showing <b>usable authentication</b>: email verification, optional Google Authenticator
            setup, and secure login using 2FA.
          </p>

          <div className="grid">
            <div className="feature">
              <div className="badge"><Icon name="lock" /> Strong authentication</div>
              <h4>2-step security</h4>
              <p>Protect accounts with an extra factor beyond password-based login.</p>
            </div>
            <div className="feature">
              <div className="badge"><Icon name="mail" /> Email-first onboarding</div>
              <h4>Verified identity</h4>
              <p>Registration requires email OTP verification before activation.</p>
            </div>
            <div className="feature">
              <div className="badge"><Icon name="shield" /> Token-based sessions</div>
              <h4>JWT sessions</h4>
              <p>After 2FA, the backend issues a token used for authenticated API calls.</p>
            </div>
            <div className="feature">
              <div className="badge">⚡</div>
              <h4>Developer-friendly</h4>
              <p>Simple flows, clear messages, and demo OTP support when SMTP is missing.</p>
            </div>
          </div>
        </section>

        {/* Right: auth panel */}
        <section className="panel">
          <h2>Authentication Console</h2>
          <p className="hint">Register → verify email → choose 2FA → login.</p>

          {msg && <div className="msg">{msg}</div>}

          {step === "home" && (
            <>
              <button onClick={() => setStep("login")}>Login</button>
              <button className="ghost" onClick={() => setStep("register")}>Create account</button>
            </>
          )}

        {step === "register" && (
          <>
            <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />

            <div className="radioRow">
              <label>
                <input
                  type="radio"
                  name="otpMethod"
                  checked={otpMethod === "AUTHENTICATOR"}
                  onChange={() => setOtpMethod("AUTHENTICATOR")}
                />
                Google Authenticator
              </label>
              <label>
                <input
                  type="radio"
                  name="otpMethod"
                  checked={otpMethod === "EMAIL"}
                  onChange={() => setOtpMethod("EMAIL")}
                />
                Email OTP
              </label>
            </div>

            <button onClick={register}>Register</button>
            <button className="ghost" onClick={() => setStep("home")}>Back</button>
          </>
        )}

        {step === "verify-email" && (
          <>
            <div className="tag">Step 1 of 2</div>
            <p className="hint" style={{ marginTop: 10 }}>Enter the OTP sent to your email</p>
            {demoOtp && (
              <small style={{ display: "block", marginBottom: 8 }}>
                Demo OTP (SMTP not configured): <b>{demoOtp}</b>
              </small>
            )}
            <input placeholder="Email OTP" value={otp} onChange={(e) => setOtp(e.target.value)} />
            <button onClick={verifyEmail}>Verify Email</button>
          </>
        )}

        {step === "setup-auth" && (
          <>
            <div className="tag">Authenticator setup</div>
            <p className="hint" style={{ marginTop: 10 }}>Email verified ✅ Now enable Google Authenticator 2FA</p>
            <button onClick={setupAuthenticator}>Generate QR</button>
          </>
        )}

        {step === "verify-auth" && (
          <>
            <div className="tag">Step 2 of 2</div>
            <p className="hint" style={{ marginTop: 10 }}>Scan this QR in Google Authenticator</p>
            {qr && <img src={qr} alt="QR" style={{ width: 180, margin: "12px auto" }} />}
            <input placeholder="Authenticator OTP" value={otp} onChange={(e) => setOtp(e.target.value)} />
            <button onClick={verifyAuthenticatorForActivation}>Verify & Activate</button>
          </>
        )}

        {step === "login" && (
          <>
            <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button onClick={login}>Login</button>
            <button className="ghost" onClick={() => setStep("home")}>Back</button>
          </>
        )}

        {step === "login-auth" && (
          <>
            <div className="tag">2FA required</div>
            <p className="hint" style={{ marginTop: 10 }}>Enter Authenticator OTP</p>
            <input placeholder="OTP" value={otp} onChange={(e) => setOtp(e.target.value)} />
            <button onClick={verifyLoginAuthenticator}>Verify & Login</button>
          </>
        )}

        {step === "login-email" && (
          <>
            <div className="tag">2FA required</div>
            <p className="hint" style={{ marginTop: 10 }}>Enter the OTP sent to your email</p>
            {demoOtp && (
              <small style={{ display: "block", marginBottom: 8 }}>
                Demo OTP (SMTP not configured): <b>{demoOtp}</b>
              </small>
            )}
            <input placeholder="OTP" value={otp} onChange={(e) => setOtp(e.target.value)} />
            <button onClick={verifyLoginEmail}>Verify & Login</button>
          </>
        )}

        {step === "dashboard" && (
          <>
            <div className="dashTop">
              <div>
                <div className="tag">Signed in</div>
                <h3 style={{ margin: "10px 0 4px" }}>Welcome to SecureAuth</h3>
                <p className="hint" style={{ margin: 0 }}>
                  You are authenticated using <b>{otpMethod === "AUTHENTICATOR" ? "Google Authenticator" : "Email OTP"}</b>.
                </p>
              </div>
            </div>

            <div className="dashGrid">
              <div className="dashCard">
                <h4>How the website works</h4>
                <ul>
                  <li><b>Register</b> with email + password</li>
                  <li><b>Verify email</b> with OTP</li>
                  <li><b>Enable 2FA</b> (Authenticator or Email OTP)</li>
                  <li><b>Login</b> and complete second factor</li>
                </ul>
              </div>
              <div className="dashCard">
                <h4>Security built in</h4>
                <ul>
                  <li>2FA reduces account takeover risk</li>
                  <li>JWT token used only after verification</li>
                  <li>Logout invalidates server-side session</li>
                  <li>Demo OTP shown only when SMTP isn’t configured</li>
                </ul>
              </div>
            </div>

            <details className="details">
              <summary>Developer details (JWT token)</summary>
              <div className="tokenBox">
                <textarea readOnly value={token} aria-label="JWT Token" />
              </div>
            </details>

            <button onClick={logout}>Logout</button>
          </>
        )}
        </section>
      </div>
    </div>
  );
}
