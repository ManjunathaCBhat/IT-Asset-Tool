// src/LoginPage.js
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';

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
            onLogin(response.data);
        } catch (err) {
            const errorMessage = err.response?.data?.msg || 'Failed to login. Please check credentials.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // --- STYLES ---
    // Common input style for both email and password for consistent sizing and appearance
    const commonInputStyle = {
        padding: '10px 15px', // Increased horizontal padding
        width: '100%',
        height: '40px', // Fixed height for consistency
        borderRadius: '4px',
        border: '1px solid #D5D5D5', // Consistent border
        boxSizing: 'border-box', // Crucial for consistent width with padding
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
    // Adjusted labelStyle for more space between label and input
    const labelStyle = { display: 'block', textAlign: 'left', color: '#6C727F', fontSize: '12px', fontWeight: '500', marginBottom: '0.4rem' }; // Reduced margin-bottom slightly (4px)

    // Style for the main Login button, with hover effect
    const signInButtonStyle = { // Renamed to signInButtonStyle but used for 'Login' text
        width: '100%',
        padding: '12px',
        border: 'none',
        borderRadius: '8px',
        backgroundColor: signInButtonHovered ? '#1d54b8' : '#296bd5ff', // Darker blue on hover
        color: 'white',
        fontSize: '14px',
        fontWeight: '700',
        cursor: 'pointer',
        marginTop: '0.5rem', // Space from password input
        transition: 'background-color 0.3s ease', // Smooth transition for hover
    };

    // Style for the Forgot Password button, with hover effect
    const forgotPasswordButtonStyle = {
        background: 'none',
        color: forgotButtonHovered ? '#1d54b8' : '#296bd5ff', // Darker blue on hover
        border: 'none',
        cursor: 'pointer',
        marginTop: '1rem', // Space from login button
        fontSize: '13px',
        textAlign: 'center',
        display: 'block',
        width: '100%',
        transition: 'color 0.3s ease', // Smooth transition for hover
    };

    const errorStyle = { color: '#D5292B', fontSize: '12px', marginTop: '0.8rem', height: '14px', textAlign: 'center' };
    const subtitleStyle = { color: '#FFFFFF', opacity: 0.8, fontSize: '14px', fontWeight: '500', marginTop: '4px' };
    // Password eye icon style with precise top adjustment
    const passwordToggleIconStyle = {
        position: 'absolute',
        right: '15px', // Distance from the right edge
        top: '67%',    // Precisely adjusted top (relative to input container)
        transform: 'translateY(-50%)',
        cursor: 'pointer',
        color: '#6C727F',
        fontSize: '16px',
        zIndex: 2,
    };
    const inputContainerStyle = {
        marginBottom: '1.2rem', // Consistent margin bottom for form rows
        position: 'relative', // Necessary for absolute positioning of the icon
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
                        {/* Email Input Field */}
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
                        {/* Password Input Field with Eye Icon */}
                        <div style={inputContainerStyle}>
                            <label htmlFor="password" style={labelStyle}>Password</label>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                style={{ ...commonInputStyle, paddingRight: '40px' }} // Increased right padding for icon space
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                            />
                            {/* Eye icon for password visibility toggle */}
                            <span
                                onClick={() => setShowPassword(!showPassword)}
                                style={passwordToggleIconStyle}
                            >
                                {showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                            </span>
                        </div>
                        {/* Error Message */}
                        <p style={errorStyle}>{error}</p>
                        {/* Login Button */}
                        <button
                            type="submit"
                            style={signInButtonStyle}
                            disabled={isLoading}
                            onMouseOver={() => setSignInButtonHovered(true)}
                            onMouseLeave={() => setSignInButtonHovered(false)}
                        >
                            {isLoading ? 'Logging In...' : 'Login'} {/* Changed text from Sign In to Login */}
                        </button>

                        {/* Forgot Password Button */}
                        <button
                            type="button"
                            onClick={() => navigate('/reset-password')}
                            style={forgotPasswordButtonStyle}
                            onMouseOver={() => setForgotButtonHovered(true)}
                            onMouseLeave={() => setForgotButtonHovered(false)}
                        >
                            Forgot Password?
                        </button>

                        {/* Forgot Password Email Sent Message */}
                        {forgotEmailSent && (
                            <div style={{ color: '#296bd5ff', margin: '6px 0', fontSize: '13px', textAlign: 'center' }}>Reset email sent. Check your inbox.</div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;