// src/LoginPage.js
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { message } from 'antd'; // Using Ant Design's message for consistency in feedback

const LoginPage = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const canvasRef = useRef(null);

    // This useEffect hook will handle the entire canvas animation.
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
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
                ctx.fillStyle = this.color;
                ctx.fill();
            }
            update() {
                if (this.x > canvas.width || this.x < 0) this.directionX = -this.directionX;
                if (this.y > canvas.height || this.y < 0) this.directionY = -this.directionY;
                this.x += this.directionX;
                this.y += this.directionY;
                this.draw();
            }
        }

        function init() {
            particlesArray = [];
            const numberOfParticles = (canvas.width * canvas.height) / 9000;
            for (let i = 0; i < numberOfParticles; i++) {
                const size = (Math.random() * 2) + 1;
                const x = (Math.random() * (canvas.width - size * 2)) + size * 2;
                const y = (Math.random() * (canvas.height - size * 2)) + size * 2;
                const directionX = (Math.random() * 0.4) - 0.2;
                const directionY = (Math.random() * 0.4) - 0.2;
                const color = 'rgba(255, 255, 255, 0.5)';
                particlesArray.push(new Particle(x, y, directionX, directionY, size, color));
            }
        }

        function connect() {
            let opacityValue = 1;
            for (let a = 0; a < particlesArray.length; a++) {
                for (let b = a; b < particlesArray.length; b++) {
                    const dx = particlesArray[a].x - particlesArray[b].x;
                    const dy = particlesArray[a].y - particlesArray[b].y;
                    const distance = dx * dx + dy * dy;
                    if (distance < (canvas.width / 7) * (canvas.height / 7)) {
                        opacityValue = 1 - (distance / 20000);
                        ctx.strokeStyle = `rgba(255, 255, 255, ${opacityValue})`;
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

        const handleResize = () => {
            setCanvasSize();
            init();
        };

        setCanvasSize();
        init();
        animate();

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            // Updated to use axios and the correct endpoint from our backend
            const response = await axios.post('http://localhost:5000/api/users/login', { email, password });
            message.success('Login Successful!');
            onLogin(response.data); // Use the onLogin prop passed from App.js
        } catch (err) {
            const errorMessage = err.response?.data?.msg || 'Failed to login. Please check credentials.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // --- STYLES ---
    const pageStyle = { display: 'flex', width: '100%', height: '100vh', fontFamily: "'Quicksand', sans-serif" };
    const leftPanelStyle = { position: 'relative', flex: 1, background: '#0d1a3a', overflow: 'hidden' };
    const canvasStyle = { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 };
    const overlayContentStyle = { position: 'relative', zIndex: 2, height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', color: 'white', textAlign: 'center' };
    const rightPanelStyle = { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F1F1', position: 'relative' };
    const formContainerStyle = { backgroundColor: '#FFFFFF', padding: '2.5rem', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)', width: '100%', maxWidth: '400px', textAlign: 'center' };
    const headingStyle = { color: '#2C4B84', fontSize: '18px', fontWeight: '700', marginBottom: '2rem' };
    const inputStyle = { width: '100%', padding: '12px', border: '1px solid #D5D5D5', borderRadius: '8px', fontSize: '14px', color: '#000929', marginTop: '0.5rem', boxSizing: 'border-box' };
    const labelStyle = { display: 'block', textAlign: 'left', color: '#6C727F', fontSize: '12px', fontWeight: '500' };
    const buttonStyle = { width: '100%', padding: '12px', border: 'none', borderRadius: '8px', backgroundColor: '#296bd5ff', color: 'white', fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginTop: '1.5rem' };
    const errorStyle = { color: '#D5292B', fontSize: '12px', marginTop: '1rem', height: '14px' };
    const loginHelpButtonStyle = { position: 'absolute', top: '2rem', right: '2rem', backgroundColor: '#FFFFFF', border: '1px solid #D5D5D5', borderRadius: '8px', padding: '8px 16px', color: '#000929', fontSize: '12px', fontWeight: '700', cursor: 'pointer' };
    const companyNameStyle = { fontSize: '32px', fontWeight: '700' };
    const cirrusStyle = { color: '#FFFFFF' };
    const labsStyle = { color: '#D5292B' };
    const subtitleStyle = { color: '#FFFFFF', opacity: 0.8, fontSize: '14px', fontWeight: '500', marginTop: '4px' };

    return (
        <div style={pageStyle}>
            <div style={leftPanelStyle}>
                <canvas ref={canvasRef} style={canvasStyle} />
                <div style={overlayContentStyle}>
                    <div style={companyNameStyle}>
                        <span style={cirrusStyle}>cirrus</span>
                        <span style={labsStyle}>labs</span>
                    </div>
                    <div style={subtitleStyle}>
                        IT Asset Management Dashboard
                    </div>
                </div>
            </div>
            <div style={rightPanelStyle}>
                <button style={loginHelpButtonStyle} onClick={() => alert('For assistance, please contact your IT administrator.')}>
                    Help
                </button>
                <div style={formContainerStyle}>
                    <h2 style={headingStyle}>IT Department Login</h2>
                    <form onSubmit={handleLogin}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label htmlFor="email" style={labelStyle}>Email Address</label>
                            <input type="email" id="email" style={inputStyle} value={email} onChange={e => setEmail(e.target.value)} required />
                        </div>
                        <div>
                            <label htmlFor="password" style={labelStyle}>Password</label>
                            <input type="password" id="password" style={inputStyle} value={password} onChange={e => setPassword(e.target.value)} required />
                        </div>
                        <p style={errorStyle}>{error}</p>
                        <button type="submit" style={buttonStyle} disabled={isLoading}>
                            {isLoading ? 'Signing In...' : 'Sign In'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
