// src/LoginPage.js
import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import axios from 'axios';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';

// ═══════════════════════════════════════════════════════════════════
//                           AUTH CONTEXT
// ═══════════════════════════════════════════════════════════════════
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('authToken') || '');
  const [info, setInfo] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const saveSession = ({ token, user, info }) => {
    localStorage.setItem('authToken', token);
    setToken(token);
    setUser(user);
    setInfo(info || '');
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setToken('');
    setUser(null);
    setInfo('');
  };

  useEffect(() => {
    if (!token) return;
    
    fetch('http://localhost:5000/api/role-info', { 
      headers: { 'x-auth-token': token } 
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(({ role, info }) => {
        setUser(prev => ({ ...prev, role }));
        setInfo(info);
      })
      .catch(() => logout());
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, info, isLoading, saveSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// ═══════════════════════════════════════════════════════════════════
//                           ROLE BANNER COMPONENT
// ═══════════════════════════════════════════════════════════════════
const RoleBanner = () => {
    const { info, user } = useAuth();
    
    if (!info || !user || !user.role) return null;

    const getBannerStyle = (role) => {
        switch (role) {
            case 'Admin':
                return {
                    background: 'linear-gradient(90deg, #52c41a, #73d13d)',
                    color: '#fff',
                };
            case 'Editor':
                return {
                    background: 'linear-gradient(90deg, #1890ff, #40a9ff)',
                    color: '#fff',
                };
            case 'Viewer':
                return {
                    background: 'linear-gradient(90deg, #faad14, #ffc53d)',
                    color: '#000',
                };
            default:
                return {
                    background: '#f0f0f0',
                    color: '#000',
                };
        }
    };

    const bannerStyle = {
        ...getBannerStyle(user.role),
        padding: '8px 16px',
        fontSize: '14px',
        fontWeight: '500',
        textAlign: 'center',
        borderBottom: '2px solid rgba(255,255,255,0.2)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        zIndex: 1000,
        position: 'relative'
    };

    return (
        <div style={bannerStyle}>
            {info}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════
//                           ORIGINAL LOGIN PAGE
// ═══════════════════════════════════════════════════════════════════
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
    const { saveSession } = useAuth();

    useEffect(() => {
        // Set body styles to prevent scrolling
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
            if (canvas.parentElement) {
                const rect = canvas.parentElement.getBoundingClientRect();
                canvas.width = rect.width;
                canvas.height = rect.height;
                canvas.style.width = `${rect.width}px`;
                canvas.style.height = `${rect.height}px`;
            }
        };

        class Particle {
            constructor(x, y, directionX, directionY, size, color) {
                this.x = x;
                this.y = y;
                this.directionX = directionX;
                this.directionY = directionY;
                this.size = size;
                this.color = color;
                this.baseSize = size;
                this.originalColor = color;
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
                ctx.fillStyle = this.color;
                ctx.fill();
            }
            update() {
                if (this.x + this.size > canvas.width || this.x - this.size < 0) this.directionX = -this.directionX;
                if (this.y + this.size > canvas.height || this.y - this.size < 0) this.directionY = -this.directionY;

                this.x += this.directionX;
                this.y += this.directionY;

                if (mouse.current.x && mouse.current.y) {
                    let dx = mouse.current.x - this.x;
                    let dy = mouse.current.y - this.y;
                    let distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < mouse.current.radius + this.size) {
                        if (this.size < this.baseSize * 2) {
                            this.size += 0.5;
                        }
                    } else if (this.size > this.baseSize) {
                        this.size -= 0.1;
                    }
                } else if (this.size > this.baseSize) {
                    this.size -= 0.1;
                }

                this.draw();
            }
        }

        function init() {
            particlesArray = [];
            const numberOfParticles = Math.max((canvas.width * canvas.height) / 7000, 30);
            const baseColors = ['rgba(255, 255, 255, 0.5)', 'rgba(74, 144, 226, 0.6)', 'rgba(208, 2, 27, 0.6)'];

            for (let i = 0; i < numberOfParticles; i++) {
                const size = (Math.random() * 1.5) + 0.8;
                const x = Math.random() * (canvas.width - size * 2) + size;
                const y = Math.random() * (canvas.height - size * 2) + size;
                const directionX = (Math.random() * 0.6) - 0.3;
                const directionY = (Math.random() * 0.6) - 0.3;
                const color = baseColors[Math.floor(Math.random() * baseColors.length)];

                particlesArray.push(new Particle(x, y, directionX, directionY, size, color));
            }
        }

        function connect() {
            const maxDistance = 120;
            for (let a = 0; a < particlesArray.length; a++) {
                for (let b = a + 1; b < particlesArray.length; b++) {
                    const dx = particlesArray[a].x - particlesArray[b].x;
                    const dy = particlesArray[a].y - particlesArray[b].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < maxDistance) {
                        let opacityValue = 1 - (distance / maxDistance);
                        ctx.strokeStyle = `rgba(255, 255, 255, ${opacityValue * 0.4})`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
                        ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
                        ctx.stroke();
                    }
                }
            }
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particlesArray.forEach(p => p.update());
            connect();
            animationFrameId = requestAnimationFrame(animate);
        }

        const handleCanvasResize = () => {
            setCanvasSize();
            init();
        };

        const handleMouseMove = (event) => {
            const rect = canvas.getBoundingClientRect();
            mouse.current.x = event.clientX - rect.left;
            mouse.current.y = event.clientY - rect.top;
        };

        const handleMouseOut = () => {
            mouse.current.x = null;
            mouse.current.y = null;
        };

        setCanvasSize();
        init();
        animate();

        window.addEventListener('resize', handleCanvasResize);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseout', handleMouseOut);

        return () => {
            window.removeEventListener('resize', handleCanvasResize);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseout', handleMouseOut);
            cancelAnimationFrame(animationFrameId);
            // Reset body styles
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        };
    }, []);

    const handleForgotPassword = async () => {
        if (!email) {
            message.warning("Please enter your email address.");
            return;
        }

        const emailRegex = /\S+@\S+\.\S+/;
        if (!emailRegex.test(email)) {
            message.warning("Please enter a valid email address.");
            return;
        }

        try {
            const response = await fetch("http://localhost:5000/api/forgot-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (response.ok) {
                setForgotEmailSent(true);
                message.success("Reset email sent. Check your inbox.");
                setTimeout(() => setForgotEmailSent(false), 5000);
            } else {
                setForgotEmailSent(false);
                message.error(data.message || "Failed to send reset email.");
            }
        } catch (error) {
            console.error("Error:", error);
            setForgotEmailSent(false);
            message.error("Something went wrong. Please try again later.");
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await axios.post('http://localhost:5000/api/users/login', { email, password });
            message.success('Login Successful!');
            
            // Save to both old system (onLogin) and new context
            if (response.data.info) {
                // New server format with role info
                saveSession(response.data);
            }
            
            // Call the original onLogin function for backward compatibility
            onLogin(response.data);
            
        } catch (err) {
            const errorMessage = err.response?.data?.msg || 'Failed to login. Please check credentials.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // --- STYLES (completely unchanged from your original) ---
    const commonInputStyle = {
        padding: '10px 15px',
        width: '100%',
        height: '40px',
        borderRadius: '4px',
        border: '1px solid #D5D5D5',
        boxSizing: 'border-box',
        fontSize: '14px',
        color: '#000929',
        backgroundColor: '#FFFFFF',
        outline: 'none',
    };

    const pageStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        width: '100vw',
        height: '100vh',
        fontFamily: "'Quicksand', sans-serif",
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        boxSizing: 'border-box'
    };

    const leftPanelStyle = {
        position: 'relative',
        flex: 1,
        background: '#0d1a3a',
        overflow: 'hidden',
        minWidth: 0,
        minHeight: 0,
        height: '100vh'
    };

    const canvasStyle = {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        display: 'block'
    };

    const overlayContentStyle = {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 2,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        color: 'white',
        textAlign: 'center',
        width: '80%',
        maxWidth: '400px',
    };

    const logoStyle = {
        width: '100%',
        maxWidth: '300px',
        height: 'auto',
        display: 'block',
        marginBottom: '10px',
    };

    const rightPanelStyle = {
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F1F1F1',
        position: 'relative',
        minWidth: 0,
        minHeight: 0,
        height: '100vh',
        overflow: 'hidden'
    };

    const formContainerStyle = {
        backgroundColor: '#FFFFFF',
        padding: '2.5rem',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '400px',
        textAlign: 'center',
        boxSizing: 'border-box'
    };

    const headingStyle = {
        color: '#2C4B84',
        fontSize: '18px',
        fontWeight: '700',
        marginBottom: '2rem',
        marginTop: 0
    };

    const labelStyle = {
        display: 'block',
        textAlign: 'left',
        color: '#6C727F',
        fontSize: '12px',
        fontWeight: '500',
        marginBottom: '0.4rem'
    };

    const signInButtonStyle = {
        width: '100%',
        padding: '12px',
        border: 'none',
        borderRadius: '8px',
        backgroundColor: signInButtonHovered ? '#1d54b8' : '#296bd5ff',
        color: 'white',
        fontSize: '14px',
        fontWeight: '700',
        cursor: 'pointer',
        marginTop: '0.5rem',
        transition: 'background-color 0.3s ease',
        outline: 'none'
    };

    const forgotPasswordButtonStyle = {
        background: 'none',
        color: forgotButtonHovered ? '#1d54b8' : '#296bd5ff',
        border: 'none',
        cursor: 'pointer',
        marginTop: '1rem',
        fontSize: '13px',
        textAlign: 'center',
        display: 'block',
        width: '100%',
        transition: 'color 0.3s ease',
        outline: 'none'
    };

    const errorStyle = {
        color: '#D5292B',
        fontSize: '12px',
        marginTop: '0.8rem',
        height: '14px',
        textAlign: 'center'
    };

    const subtitleStyle = {
        color: '#FFFFFF',
        opacity: 0.8,
        fontSize: '14px',
        fontWeight: '500',
        marginTop: '4px'
    };

    const passwordToggleIconStyle = {
        position: 'absolute',
        right: '15px',
        top: '67%',
        transform: 'translateY(-50%)',
        cursor: 'pointer',
        color: '#6C727F',
        fontSize: '16px',
        zIndex: 2,
    };

    const inputContainerStyle = {
        marginBottom: '1.2rem',
        position: 'relative',
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
                    <div style={subtitleStyle}>
                        IT Asset Management Dashboard
                    </div>
                </div>
            </div>
            <div style={rightPanelStyle}>
                <div style={formContainerStyle}>
                    <h2 style={headingStyle}>IT Department Login</h2>
                    <form onSubmit={handleLogin}>
                        <div style={inputContainerStyle}>
                            <label htmlFor="email" style={labelStyle}>Email Address</label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                required
                                style={commonInputStyle}
                            />
                        </div>
                        <div style={inputContainerStyle}>
                            <label htmlFor="password" style={labelStyle}>Password</label>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                style={{ ...commonInputStyle, paddingRight: '40px' }}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                            />
                            <span
                                onClick={() => setShowPassword(!showPassword)}
                                style={passwordToggleIconStyle}
                            >
                                {showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                            </span>
                        </div>
                        <p style={errorStyle}>{error}</p>
                        <button
                            type="submit"
                            style={signInButtonStyle}
                            disabled={isLoading}
                            onMouseOver={() => setSignInButtonHovered(true)}
                            onMouseLeave={() => setSignInButtonHovered(false)}
                        >
                            {isLoading ? 'Logging In...' : 'Login'}
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate('/reset-password')}
                            style={forgotPasswordButtonStyle}
                            onMouseOver={() => setForgotButtonHovered(true)}
                            onMouseLeave={() => setForgotButtonHovered(false)}
                        >
                            Forgot Password?
                        </button>

                        {forgotEmailSent && (
                            <div style={{ color: '#296bd5ff', margin: '6px 0', fontSize: '13px', textAlign: 'center' }}>
                                Reset email sent. Check your inbox.
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
};

const LoginPageWithProvider = ({ onLogin }) => (
    <AuthProvider>
        <LoginPage onLogin={onLogin} />
    </AuthProvider>
);

export default LoginPageWithProvider;
export { AuthProvider, useAuth, RoleBanner };
