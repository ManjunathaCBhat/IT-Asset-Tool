import React, {
  useState,
  useEffect,
  useRef,
  createContext,
  useContext,
  useCallback,
} from 'react';
import axios from 'axios';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('authToken') || '');
  const [info, setInfo] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  /* saveSession is called after successful login */
  const saveSession = useCallback(({ token, user, info }) => {
    localStorage.setItem('authToken', token);
    setToken(token);
    setUser(user);
    setInfo(info || '');
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    setToken('');
    setUser(null);
    setInfo('');
  }, []);

  /* fetch role/info if token exists */
  useEffect(() => {
    if (!token) return;
    fetch('http://localhost:5000/api/role-info', {
      headers: { 'x-auth-token': token },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(({ role, info }) => {
        setUser((prev) => ({ ...prev, role }));
        setInfo(info);
      })
      .catch(() => logout());
  }, [token, logout]);

  return (
    <AuthContext.Provider
      value={{ user, token, info, isLoading, saveSession, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

/* simple role banner shown at top of pages if desired */
const RoleBanner = () => {
  const { info, user } = useAuth();
  if (!info || !user?.role) return null;

  /* pick gradient by role */
  const bg = {
    Admin: 'linear-gradient(90deg,#52c41a,#73d13d)',
    Editor: 'linear-gradient(90deg,#1890ff,#40a9ff)',
    Viewer: 'linear-gradient(90deg,#faad14,#ffc53d)',
  }[user.role] || '#f0f0f0';

  const color = user.role === 'Viewer' ? '#000' : '#fff';

  return (
    <div
      style={{
        background: bg,
        color,
        padding: '8px 16px',
        fontSize: 14,
        fontWeight: 500,
        textAlign: 'center',
        borderBottom: '2px solid rgba(255,255,255,0.2)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        position: 'relative',
        zIndex: 1000,
      }}
    >
      {info}
    </div>
  );
};


const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [forgotEmailSent, setForgotEmailSent] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [signInButtonHovered, setSignInButtonHovered] = useState(false);
  const [forgotButtonHovered, setForgotButtonHovered] = useState(false);

  const canvasRef = useRef(null);
  const mouse = useRef({ x: null, y: null, radius: 150 });
  const navigate = useNavigate();
  const { saveSession } = useAuth(); // get from context to save role/token

  /* ===== background canvas animation ===== */
  useEffect(() => {
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particlesArray = [];

    const setCanvasSize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    class Particle {
      constructor(x, y, directionX, directionY, size, color) {
        this.x = x;
        this.y = y;
        this.directionX = directionX;
        this.directionY = directionY;
        this.size = size;
        this.baseSize = size;
        this.color = color;
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
        ctx.fillStyle = this.color;
        ctx.fill();
      }
      update() {
        if (this.x + this.size > canvas.width || this.x - this.size < 0)
          this.directionX = -this.directionX;
        if (this.y + this.size > canvas.height || this.y - this.size < 0)
          this.directionY = -this.directionY;

        this.x += this.directionX;
        this.y += this.directionY;

        if (mouse.current.x && mouse.current.y) {
          const dx = mouse.current.x - this.x;
          const dy = mouse.current.y - this.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < mouse.current.radius + this.size) {
            if (this.size < this.baseSize * 2) this.size += 0.5;
          } else if (this.size > this.baseSize) {
            this.size -= 0.1;
          }
        } else if (this.size > this.baseSize) {
          this.size -= 0.1;
        }
        this.draw();
      }
    }

    const init = () => {
      particlesArray = [];
      const numberOfParticles = Math.max(
        (canvas.width * canvas.height) / 7000,
        30
      );
      const baseColors = [
        'rgba(255,255,255,0.5)',
        'rgba(74,144,226,0.6)',
        'rgba(208,2,27,0.6)',
      ];
      for (let i = 0; i < numberOfParticles; i++) {
        const size = Math.random() * 1.5 + 0.8;
        const x = Math.random() * (canvas.width - size * 2) + size;
        const y = Math.random() * (canvas.height - size * 2) + size;
        const directionX = Math.random() * 0.6 - 0.3;
        const directionY = Math.random() * 0.6 - 0.3;
        const color =
          baseColors[Math.floor(Math.random() * baseColors.length)];
        particlesArray.push(new Particle(x, y, directionX, directionY, size, color));
      }
    };

    const connect = () => {
      const maxDistance = 120;
      particlesArray.forEach((a, i) => {
        for (let j = i + 1; j < particlesArray.length; j++) {
          const b = particlesArray[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDistance) {
            const opacity = 1 - dist / maxDistance;
            ctx.strokeStyle = `rgba(255,255,255,${opacity * 0.4})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      });
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesArray.forEach((p) => p.update());
      connect();
      animationFrameId = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      setCanvasSize();
      init();
    };
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current.x = e.clientX - rect.left;
      mouse.current.y = e.clientY - rect.top;
    };
    const handleMouseOut = () => {
      mouse.current.x = null;
      mouse.current.y = null;
    };

    setCanvasSize();
    init();
    animate();
    window.addEventListener('resize', handleResize);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseout', handleMouseOut);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseout', handleMouseOut);
      cancelAnimationFrame(animationFrameId);
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  /* ===== password reset ===== */
  const handleForgotPassword = async () => {
    if (!email) return message.warning('Please enter your email address.');
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email))
      return message.warning('Please enter a valid email address.');

    try {
      const res = await fetch('http://localhost:5000/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setForgotEmailSent(true);
        message.success('Reset email sent. Check your inbox.');
        setTimeout(() => setForgotEmailSent(false), 5000);
      } else {
        message.error(data.message || 'Failed to send reset email.');
      }
    } catch {
      message.error('Something went wrong. Please try again later.');
    }
  };

  /* ===== login ===== */
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const res = await axios.post('http://localhost:5000/api/users/login', {
        email,
        password,
      });
      message.success('Login Successful!');
      /* save role/token in context if backend returns them */
      if (res.data?.token) saveSession(res.data);
      if (onLogin) onLogin(res.data); // legacy callback
    } catch (err) {
      setError(
        err.response?.data?.msg || 'Failed to login. Please check credentials.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  /* ===== styles (inline) ===== */
  const commonInputStyle = {
  padding: '8px 12px',
  width: '100%',
  height: 36,
  borderRadius: 4,
  border: '1px solid #D5D5D5',
  fontSize: 14,
  color: '#000929',
  backgroundColor: '#fff',
  boxSizing: 'border-box',     // ← key line
};

  const pageStyle = {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    width: '100vw',
    height: '100vh',
    fontFamily: "'Quicksand', sans-serif",
    overflow: 'hidden',
  };

  const leftPanelStyle = {
    position: 'relative',
    flex: 1,
    background: '#0d1a3a',
    overflow: 'hidden',
  };

  const canvasStyle = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    zIndex: 1,
  };

  const overlayContentStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%,-50%)',
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    color: '#fff',
    textAlign: 'center',
    width: '80%',
    maxWidth: 400,
  };

  const logoStyle = {
    maxWidth: 300,
    width: '100%',
    height: 'auto',
    marginBottom: 10,
  };

  const rightPanelStyle = {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F1F1',
  };

  const formContainerStyle = {
    backgroundColor: '#fff',
    padding: '2.5rem',
    borderRadius: 16,
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: 400,
    textAlign: 'center',
  };

  const buttonBase = {
    width: '100%',
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    outline: 'none',
  };

  return (
    <div style={pageStyle}>
      <div style={leftPanelStyle}>
        <canvas ref={canvasRef} style={canvasStyle} />
        <div style={overlayContentStyle}>
          <img
            src={`${process.env.PUBLIC_URL}/C_lab logo.png`}
            alt="Cirrus Labs Logo"
            style={logoStyle}
          />
          <div style={{ color: '#fff', opacity: 0.8, fontSize: 14 }}>
            IT Asset Management Dashboard
          </div>
        </div>
      </div>

      <div style={rightPanelStyle}>
        <div style={formContainerStyle}>
          <h2 style={{ color: '#2C4B84', fontSize: 18, margin: 0, marginBottom: '2rem' }}>
            IT Department Login
          </h2>

          <form onSubmit={handleLogin}>
            {/* email */}
            <div style={{ marginBottom: '1.2rem', position: 'relative'}}>
              <label style={{ display: 'block', textAlign: 'left', fontSize: 12, marginBottom: 4 }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                style={commonInputStyle}
              />
            </div>

            {/* password */}
            <div style={{ marginBottom: '1.2rem', position: 'relative' }}>
              <label style={{ display: 'block', textAlign: 'left', fontSize: 12, marginBottom: 4 }}>
                Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                style={{ ...commonInputStyle, paddingRight: 40 }}
              />
              <span
                onClick={() => setShowPassword((s) => !s)}
                style={{
                  position: 'absolute',
                  right: 15,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  cursor: 'pointer',
                  color: '#6C727F',
                  fontSize: 16,
                  zIndex: 2,
                }}
              >
                {showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              </span>
            </div>

            {/* error text */}
            <p style={{ color: '#D5292B', fontSize: 12, height: 14 }}>{error}</p>

            {/* login button */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                ...buttonBase,
                border: 'none',
                backgroundColor: signInButtonHovered ? '#1d54b8' : '#296bd5ff',
                color: '#fff',
                transition: 'background-color 0.3s',
              }}
              onMouseEnter={() => setSignInButtonHovered(true)}
              onMouseLeave={() => setSignInButtonHovered(false)}
            >
              {isLoading ? 'Logging In...' : 'Login'}
            </button>

            {/* forgot password */}
            <button
              type="button"
              onClick={handleForgotPassword}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 13,
                marginTop: '1rem',
                color: forgotButtonHovered ? '#1d54b8' : '#296bd5ff',
                cursor: 'pointer',
              }}
              onMouseEnter={() => setForgotButtonHovered(true)}
              onMouseLeave={() => setForgotButtonHovered(false)}
            >
              Forgot Password?
            </button>

            {forgotEmailSent && (
              <div style={{ color: '#296bd5ff', fontSize: 13, marginTop: 6 }}>
                Reset email sent. Check your inbox.
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

/* Wrapper providing context to the page */
const LoginPageWithProvider = ({ onLogin }) => (
  <AuthProvider>
    <LoginPage onLogin={onLogin} />
  </AuthProvider>
);

/* ══ EXPORTS ══ */
export default LoginPageWithProvider;
export { AuthProvider, useAuth, RoleBanner };
