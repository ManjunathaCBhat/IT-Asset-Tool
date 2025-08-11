// src/LoginPage.js
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { EyeOutlined, EyeInvisibleOutlined, ArrowLeftOutlined } from '@ant-design/icons';

const LoginPage = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [signInButtonHovered, setSignInButtonHovered] = useState(false);
    const [forgotButtonHovered, setForgotButtonHovered] = useState(false);

    // Forgot Password States
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotStep, setForgotStep] = useState(1); // 1: Enter email, 2: Enter new passwords
    const [forgotEmail, setForgotEmail] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotError, setForgotError] = useState('');

    const canvasRef = useRef(null);
    const mouse = useRef({ x: null, y: null, radius: 150 });
    const navigate = useNavigate();

    // Canvas animation code (keeping your existing animation)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animationFrameId;
        let particlesArray = [];

        const setCanvasSize = () => {
            if (canvas.parentElement) {
                canvas.width = canvas.parentElement.offsetWidth;
                canvas.height = canvas.parentElement.offsetHeight;
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
            const numberOfParticles = (canvas.width * canvas.height) / 7000;
            const baseColors = ['rgba(255, 255, 255, 0.5)', 'rgba(74, 144, 226, 0.6)', 'rgba(208, 2, 27, 0.6)'];

            for (let i = 0; i < numberOfParticles; i++) {
                const size = (Math.random() * 1.5) + 0.8;
                const x = (Math.random() * canvas.width);
                const y = (Math.random() * canvas.height);
                const directionX = (Math.random() * 0.6) - 0.3;
                const directionY = (Math.random() * 0.6) - 0.3;
                const color = baseColors[Math.floor(Math.random() * baseColors.length)];

                particlesArray.push(new Particle(x, y, directionX, directionY, size, color));
            }
        }

        function connect() {
            const maxDistance = 120;
            for (let a = 0; a < particlesArray.length; a++) {
                for (let b = a; b < particlesArray.length; b++) {
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
            mouse.current.x = event.x;
            mouse.current.y = event.y;
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
        };
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await axios.post('http://localhost:5000/api/users/login', { email, password });
            message.success('Login Successful!');
            onLogin(response.data);
        } catch (err) {
            const errorMessage = err.response?.data?.msg || 'Failed to login. Please check credentials.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // Forgot Password Functions
    const handleForgotPasswordClick = () => {
        setShowForgotModal(true);
        setForgotStep(1);
        setForgotEmail('');
        setResetToken('');
        setNewPassword('');
        setConfirmPassword('');
        setForgotError('');
    };

    const closeForgotModal = () => {
        setShowForgotModal(false);
        setForgotStep(1);
        setForgotEmail('');
        setResetToken('');
        setNewPassword('');
        setConfirmPassword('');
        setForgotError('');
    };

    const handleRequestReset = async (e) => {
        e.preventDefault();
        setForgotLoading(true);
        setForgotError('');

        if (!forgotEmail) {
            setForgotError('Please enter your email address.');
            setForgotLoading(false);
            return;
        }

        const emailRegex = /\S+@\S+\.\S+/;
        if (!emailRegex.test(forgotEmail)) {
            setForgotError('Please enter a valid email address.');
            setForgotLoading(false);
            return;
        }

        try {
            const response = await axios.post('http://localhost:5000/api/forgot-password', {
                email: forgotEmail
            });

            if (response.data.success) {
                message.success('Reset token sent to your email. Please check your inbox.');
                setForgotStep(2);
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Failed to send reset email. Please try again.';
            setForgotError(errorMessage);
        } finally {
            setForgotLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setForgotLoading(true);
        setForgotError('');

        // Validation
        if (!resetToken || !newPassword || !confirmPassword) {
            setForgotError('Please fill in all fields.');
            setForgotLoading(false);
            return;
        }

        if (newPassword !== confirmPassword) {
            setForgotError('Passwords do not match.');
            setForgotLoading(false);
            return;
        }

        if (newPassword.length < 6) {
            setForgotError('Password must be at least 6 characters long.');
            setForgotLoading(false);
            return;
        }

        try {
            const response = await axios.post('http://localhost:5000/api/reset-password', {
                email: forgotEmail,
                token: resetToken,
                newPassword: newPassword
            });

            if (response.data.success) {
                message.success('Password reset successfully! You can now login with your new password.');
                closeForgotModal();
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Failed to reset password. Please check your token and try again.';
            setForgotError(errorMessage);
        } finally {
            setForgotLoading(false);
        }
    };

    // --- STYLES ---
    const commonInputStyle = {
        padding: '10px 15px',
        width: '100%',
        height: '40px',
        borderRadius: '4px',
        border: '1px solid #D5D5D5',
        boxSizing: 'border-box',
        fontSize: '14px',
        color: '#000929',
    };

    const pageStyle = { display: 'flex', width: '100%', height: '100vh', fontFamily: "'Quicksand', sans-serif" };
    const leftPanelStyle = { position: 'relative', flex: 1, background: '#0d1a3a', overflow: 'hidden' };
    const canvasStyle = { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 };
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

    const rightPanelStyle = { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F1F1', position: 'relative' };
    const formContainerStyle = { backgroundColor: '#FFFFFF', padding: '2.5rem', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)', width: '100%', maxWidth: '400px', textAlign: 'center' };
    const headingStyle = { color: '#2C4B84', fontSize: '18px', fontWeight: '700', marginBottom: '2rem' };
    const labelStyle = { display: 'block', textAlign: 'left', color: '#6C727F', fontSize: '12px', fontWeight: '500', marginBottom: '0.4rem' };

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
    };

    const errorStyle = { color: '#D5292B', fontSize: '12px', marginTop: '0.8rem', height: '14px', textAlign: 'center' };
    const subtitleStyle = { color: '#FFFFFF', opacity: 0.8, fontSize: '14px', fontWeight: '500', marginTop: '4px' };
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

    // Modal Styles
    const modalOverlayStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    };

    const modalContentStyle = {
        backgroundColor: '#FFFFFF',
        padding: '2rem',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
        width: '90%',
        maxWidth: '400px',
        textAlign: 'center',
        position: 'relative',
    };

    const backButtonStyle = {
        position: 'absolute',
        top: '20px',
        left: '20px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '18px',
        color: '#296bd5ff',
    };

    const closeButtonStyle = {
        position: 'absolute',
        top: '15px',
        right: '20px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '20px',
        color: '#666',
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
                            onClick={handleForgotPasswordClick}
                            style={forgotPasswordButtonStyle}
                            onMouseOver={() => setForgotButtonHovered(true)}
                            onMouseLeave={() => setForgotButtonHovered(false)}
                        >
                            Forgot Password?
                        </button>
                    </form>
                </div>
            </div>

            {/* Forgot Password Modal */}
            {showForgotModal && (
                <div style={modalOverlayStyle} onClick={closeForgotModal}>
                    <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
                        <button style={closeButtonStyle} onClick={closeForgotModal}>
                            ×
                        </button>
                        
                        {forgotStep === 2 && (
                            <button style={backButtonStyle} onClick={() => setForgotStep(1)}>
                                <ArrowLeftOutlined />
                            </button>
                        )}

                        {forgotStep === 1 ? (
                            <>
                                <h3 style={{ ...headingStyle, marginBottom: '1.5rem' }}>Reset Password</h3>
                                <form onSubmit={handleRequestReset}>
                                    <div style={inputContainerStyle}>
                                        <label style={labelStyle}>Email Address</label>
                                        <input
                                            type="email"
                                            value={forgotEmail}
                                            onChange={(e) => setForgotEmail(e.target.value)}
                                            placeholder="Enter your email"
                                            required
                                            style={commonInputStyle}
                                        />
                                    </div>
                                    {forgotError && <p style={errorStyle}>{forgotError}</p>}
                                    <button
                                        type="submit"
                                        style={signInButtonStyle}
                                        disabled={forgotLoading}
                                    >
                                        {forgotLoading ? 'Sending...' : 'Send Reset Token'}
                                    </button>
                                </form>
                            </>
                        ) : (
                            <>
                                <h3 style={{ ...headingStyle, marginBottom: '1.5rem' }}>Enter New Password</h3>
                                <form onSubmit={handleResetPassword}>
                                    <div style={inputContainerStyle}>
                                        <label style={labelStyle}>Reset Token</label>
                                        <input
                                            type="text"
                                            value={resetToken}
                                            onChange={(e) => setResetToken(e.target.value)}
                                            placeholder="Enter the token from your email"
                                            required
                                            style={commonInputStyle}
                                        />
                                    </div>
                                    <div style={inputContainerStyle}>
                                        <label style={labelStyle}>New Password</label>
                                        <input
                                            type={showNewPassword ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Enter new password"
                                            required
                                            style={{ ...commonInputStyle, paddingRight: '40px' }}
                                        />
                                        <span
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            style={passwordToggleIconStyle}
                                        >
                                            {showNewPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                                        </span>
                                    </div>
                                    <div style={inputContainerStyle}>
                                        <label style={labelStyle}>Confirm New Password</label>
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Confirm new password"
                                            required
                                            style={{ ...commonInputStyle, paddingRight: '40px' }}
                                        />
                                        <span
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            style={passwordToggleIconStyle}
                                        >
                                            {showConfirmPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                                        </span>
                                    </div>
                                    {forgotError && <p style={errorStyle}>{forgotError}</p>}
                                    <button
                                        type="submit"
                                        style={signInButtonStyle}
                                        disabled={forgotLoading}
                                    >
                                        {forgotLoading ? 'Resetting...' : 'Reset Password'}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LoginPage;
