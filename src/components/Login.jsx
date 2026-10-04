import {
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import Footer from "./Footer";
import { auth, db } from "../firebase";

import "../css/Login.css";

import googleIcon from "../assets/Googlelogo.png";

function Login({ setRole }) {
  const location = useLocation();
  const navigate = useNavigate();

  /* =========================================
      GENERAL AUTH STATE
  ========================================= */

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* =========================================
      LOGIN STATE
  ========================================= */

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  /* =========================================
      PREFILL LOGIN EMAIL AFTER REGISTRATION
  ========================================= */

  useEffect(() => {
    if (location.state?.registered && location.state?.email) {
      setLoginEmail(location.state.email);
      setLoginPassword("");
    }
  }, [location.state?.registered, location.state?.email]);

  /* =========================================
      CLEAR MESSAGES WHEN PAGE CHANGES
  ========================================= */

  useEffect(() => {
    setError("");
    setSuccess("");
  }, [location.pathname]);

  /* =========================================
      NAVIGATION
  ========================================= */

  const goToRegister = () => {
    setError("");
    setSuccess("");

    navigate("/register");
  };

  const goHome = () => {
    setError("");
    setSuccess("");

    navigate("/");
  };

  /* =========================================
      FIND USER ROLE
  ========================================= */

  const getUserRole = async (user) => {
    try {
      if (!user?.uid) {
        console.error("getUserRole: Firebase user has no UID.");
        return null;
      }

      console.log(
        "Looking for Firestore profile:",
        `users/${user.uid}`
      );

      const userRef = doc(db, "users", user.uid);
      const userSnapshot = await getDoc(userRef);

      if (userSnapshot.exists()) {
        const userData = userSnapshot.data();

        console.log("Firestore profile found:", userData);

        const userRole = userData.role;

        if (!userRole) {
          console.error(
            "Firestore profile exists but has no role."
          );
          return null;
        }

        localStorage.setItem("userRole", userRole);

        if (userData.studentId) {
          localStorage.setItem("studentId", userData.studentId);
        }

        setRole?.(userRole);

        return userRole;
      }

      console.warn(
        "No profile found by UID. Searching by email..."
      );

      if (user.email) {
        const usersQuery = query(
          collection(db, "users"),
          where("email", "==", user.email)
        );

        const usersSnapshot = await getDocs(usersQuery);

        if (!usersSnapshot.empty) {
          const userData = usersSnapshot.docs[0].data();

          console.log("Profile found by email:", userData);

          const userRole = userData.role;

          if (!userRole) {
            console.error(
              "Profile found but role is missing."
            );
            return null;
          }

          localStorage.setItem("userRole", userRole);

          if (userData.studentId) {
            localStorage.setItem(
              "studentId",
              userData.studentId
            );
          }

          setRole?.(userRole);

          return userRole;
        }
      }

      console.error("No Firestore profile found for:", {
        uid: user.uid,
        email: user.email,
      });

      return null;
    } catch (err) {
      console.error("Error finding user role:", err);

      return null;
    }
  };

  /* =========================================
      REDIRECT BY ROLE
  ========================================= */

  const redirectByRole = (userRole) => {
    switch (userRole) {
      case "admin":
        navigate("/admin");
        break;

      case "student":
        navigate("/student");
        break;

      default:
        navigate("/");
    }
  };

  /* =========================================
      EMAIL LOGIN
  ========================================= */

  const handleLogin = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const email = loginEmail.trim();

      if (!email) {
        setError("Please enter your email address.");
        return;
      }

      if (!loginPassword) {
        setError("Please enter your password.");
        return;
      }

      console.log("Signing in:", email);

      const userCredential =
        await signInWithEmailAndPassword(
          auth,
          email,
          loginPassword
        );

      const user = userCredential.user;

      if (!user) {
        setError(
          "Unable to load your account. Please try logging in again."
        );
        return;
      }

      console.log(
        "Firebase login successful:",
        user.uid
      );

      const userRole = await getUserRole(user);

      if (!userRole) {
        setError(
          "Your account was authenticated, but no user profile or role was found. Please contact the administrator."
        );
        return;
      }

      redirectByRole(userRole);
    } catch (err) {
      console.error("Login error:", err);

      switch (err.code) {
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
          setError("Invalid email or password.");
          break;

        case "auth/invalid-email":
          setError("Please enter a valid email address.");
          break;

        case "auth/too-many-requests":
          setError(
            "Too many failed attempts. Please try again later."
          );
          break;

        case "auth/user-disabled":
          setError("This account has been disabled.");
          break;

        default:
          setError(
            err?.message ||
              "Unable to log in. Please try again."
          );
      }
    } finally {
      setLoading(false);
    }
  };

  /* =========================================
      GOOGLE LOGIN
  ========================================= */

  const loginWithGoogle = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();

      provider.setCustomParameters({
        prompt: "select_account",
      });

      const result = await signInWithPopup(auth, provider);

      const user = result.user;

      if (!user) {
        setError(
          "Unable to load your Google account. Please try again."
        );
        return;
      }

      console.log(
        "Google login successful:",
        user.uid
      );

      const userRole = await getUserRole(user);

      if (!userRole) {
        setError(
          "Google sign-in worked, but this Google account is not registered in OyFound."
        );
        return;
      }

      redirectByRole(userRole);
    } catch (err) {
      console.error("Google login error:", err);

      switch (err.code) {
        case "auth/popup-closed-by-user":
          setError("Google sign-in was cancelled.");
          break;

        case "auth/popup-blocked":
          setError(
            "Your browser blocked the Google sign-in popup. Please allow popups for this website and try again."
          );
          break;

        case "auth/unauthorized-domain":
          setError(
            "This website domain is not authorized for Google sign-in. Add your Vercel domain in Firebase Authentication > Settings > Authorized domains."
          );
          break;

        case "auth/operation-not-allowed":
          setError(
            "Google sign-in is not enabled. Enable Google under Firebase Authentication > Sign-in method."
          );
          break;

        case "auth/account-exists-with-different-credential":
          setError(
            "An account already exists with this email using a different sign-in method. Please use the original sign-in method."
          );
          break;

        case "auth/network-request-failed":
          setError(
            "Network error while connecting to Google. Check your internet connection and try again."
          );
          break;

        default:
          setError(
            err?.message
              ? `Google login failed: ${err.message}`
              : "Unable to sign in with Google. Please try again."
          );
          break;
      }
    } finally {
      setLoading(false);
    }
  };

  /* =========================================
      FORGOT PASSWORD
  ========================================= */

  const handleForgotPassword = async () => {
    if (!loginEmail.trim()) {
      setError("Please enter your email address first.");
      return;
    }

    setError("");
    setSuccess("");

    try {
      await sendPasswordResetEmail(
        auth,
        loginEmail.trim()
      );

      setSuccess(
        "Password reset email sent. Please check your inbox."
      );
    } catch (err) {
      console.error("Password reset error:", err);

      if (err.code === "auth/user-not-found") {
        setError("No account was found with this email.");
      } else {
        setError(
          "Unable to send password reset email."
        );
      }
    }
  };

  /* =========================================
      LOGIN UI
  ========================================= */

  return (
    <div className="auth-page">
      {/* BACKGROUND */}
      <div className="auth-background">
        <div className="auth-orb auth-orb-one"></div>
        <div className="auth-orb auth-orb-two"></div>
        <div className="auth-orb auth-orb-three"></div>
      </div>

      {/* LOGIN CONTAINER */}
      <div className="auth-card login-card">
        {/* =================================
            WELCOME PANEL
        ================================= */}
        <div className="welcome-panel">
          <div className="welcome-panel-content">
            <div className="welcome-eyebrow">OYFOUND</div>

            <h1>Welcome Back!</h1>

            <p>
              Login to continue your journey and help lost belongings find their way home.
            </p>

            <div className="welcome-divider"></div>

            <p className="welcome-small-text">Don't have an account?</p>

            <button
              type="button"
              className="outline-auth-button"
              onClick={goToRegister}
            >
              REGISTER
            </button>
          </div>
        </div>

        {/* =================================
            FORM PANEL
        ================================= */}
        <div className="form-panel">
          <div className="form-wrapper">
            <h2>Login</h2>

            <p className="form-subtitle">Login to continue to OyFound</p>

            {location.state?.registered && (
              <div className="auth-success">
                Account created successfully. Please log in.
              </div>
            )}

            {error && <div className="auth-error">{error}</div>}

            {success && <div className="auth-success">{success}</div>}

            <form onSubmit={handleLogin}>
              {/* EMAIL */}
              <div className="form-input-group">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </div>

              {/* PASSWORD */}
              <div className="form-input-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>

              {/* FORGOT PASSWORD */}
              <div className="forgot-row">
                <button type="button" onClick={handleForgotPassword}>
                  Forgot your password?
                </button>
              </div>

              {/* LOGIN */}
              <button
                type="submit"
                className="primary-form-button"
                disabled={loading}
              >
                {loading ? "LOGGING IN..." : "LOGIN"}
              </button>
            </form>

            {/* OR */}
            <div className="or-divider">
              <span></span>
              <p>OR</p>
              <span></span>
            </div>

            {/* GOOGLE */}
            <button
              type="button"
              className="google-button"
              onClick={loginWithGoogle}
              disabled={loading}
            >
              <img
                src={googleIcon}
                alt="Google Icon"
                className="google-icon"
              />
              <span>Continue with Google</span>
            </button>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <Footer />
    </div>
  );
}

export default Login;