import { sendPasswordResetEmail } from "firebase/auth";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Password reset email sent! Check your inbox for further instructions.");
      setEmail(''); // Clear input on success
    } catch (err) {
      setError("Failed to send password reset email. Please verify your email address.");
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="form-wrapper">
        <h1 className="form-title">Reset Password</h1>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '20px', fontSize: '14px' }}>
          Enter your email address and we'll send you a link to reset your password.
        </p>
        
        <form className="login-form-container" onSubmit={handleResetPassword}>
          {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
          {message && <p style={{ color: 'green', textAlign: 'center' }}>{message}</p>}
          
          <div className="input-group">
            <input 
              type="email" 
              className="input-field full-width" 
              placeholder="Email Address" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div>

          <button 
            type="submit" 
            className="signup-btn login-btn-wide" 
            disabled={loading}
            style={{ opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <span 
            onClick={() => navigate('/login')} 
            style={{ color: '#007bff', cursor: 'pointer', fontSize: '14px', textDecoration: 'underline' }}
          >
            Back to Login
          </span>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;