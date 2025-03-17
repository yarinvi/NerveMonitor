import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { FcGoogle } from 'react-icons/fc';
import { FiMail, FiLock } from 'react-icons/fi';
import './Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    try {
      await login({ email, password });
      toast.success('Successfully logged in!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error?.response?.data?.message || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      toast.success('Successfully logged in with Google!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Google sign-in error:', error);
      toast.error('Failed to login with Google. Please try again.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-left">
        <div className="geometric-shapes"></div>
        <div className="floating-shapes"></div>
        <div className="login-left-content">
          <h2>Welcome Back</h2>
          <p>
            Your health monitoring journey continues here. Access your personalized dashboard 
            and stay connected with your wellness data.
          </p>
        </div>
      </div>
      
      <div className="login-right">
        <div className="login-form-container">
          <div className="login-header">
            <h1>Sign in to your account</h1>
            <p>Enter your credentials to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <div className="input-group">
                <div className="input-field">
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter your email"
                    disabled={loading}
                  />
                  <div className="input-icon">
                    <FiMail size={18} />
                  </div>
                </div>
              </div>
            </div>

            <div className="form-group">
              <div className="input-group">
                <div className="input-field">
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                    disabled={loading}
                  />
                  <div className="input-icon">
                    <FiLock size={18} />
                  </div>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              className="login-button"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in to account'}
            </button>

            <div className="login-divider">
              <span>or</span>
            </div>

            <button 
              type="button"
              className="google-button" 
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <FcGoogle size={20} />
              <span>Continue with Google</span>
            </button>

            <div className="login-links">
              <Link to="/register">Don't have an account? Create one now</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login; 