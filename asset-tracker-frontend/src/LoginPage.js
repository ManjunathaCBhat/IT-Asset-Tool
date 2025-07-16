// src/LoginPage.js
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { message } from 'antd'; // Using Ant Design's message for consistency in feedback

// REMOVE THE PREVIOUS LOGO IMPORT LINE AND THE MISPLACED JSX BLOCK:
// import CirrusLabsLogo from '.public\C_lab logo.png'; // <--- This line is wrong
// // Inside your LoginPage.js JSX:
// <img
//     src={`${process.env.PUBLIC_URL}/C_lab logo.png`} // <-- Correct way to reference
//     alt="Cirrus Labs Logo"
//     style={logoStyle}
// />

const LoginPage = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const canvasRef = useRef(null);
    const mouse = useRef({ x: null, y: null, radius: 150 }); // Mouse interaction for particles

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

        // Update Particle class for more dynamic behavior
        class Particle {
            constructor(x, y, directionX, directionY, size, color) {
                this.x = x;
                this.y = y;
                this.directionX = directionX;
                this.directionY = directionY;
                this.size = size;
                this.color = color; // e.g., 'rgba(255, 255, 255, 0.5)'
                this.baseSize = size; // Store original size for scaling effects
                this.originalColor = color; // Store original color for fading effects
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
                ctx.fillStyle = this.color;
                ctx.fill();
            }
            update() {
                // Bounce off edges
                if (this.x + this.size > canvas.width || this.x - this.size < 0) this.directionX = -this.directionX;
                if (this.y + this.size > canvas.height || this.y - this.size < 0) this.directionY = -this.directionY;

                this.x += this.directionX;
                this.y += this.directionY;

                // Mouse interaction effect
                if (mouse.current.x && mouse.current.y) {
                    let dx = mouse.current.x - this.x;
                    let dy = mouse.current.y - this.y;
                    let distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < mouse.current.radius + this.size) {
                        if (this.size < this.baseSize * 2) { // Max size increase
                            this.size += 0.5;
                        }
                    } else if (this.size > this.baseSize) {
                        this.size -= 0.1; // Shrink back slowly
                    }
                } else if (this.size > this.baseSize) {
                    this.size -= 0.1; // Shrink back if mouse leaves
                }

                this.draw();
            }
        }

        function init() {
            particlesArray = [];
            // Increased number of particles for a denser effect
            const numberOfParticles = (canvas.width * canvas.height) / 7000; // Adjusted density
            const baseColors = ['rgba(255, 255, 255, 0.5)', 'rgba(74, 144, 226, 0.6)', 'rgba(208, 2, 27, 0.6)']; // White, Cirrus blue, Labs red

            for (let i = 0; i < numberOfParticles; i++) {
                const size = (Math.random() * 1.5) + 0.8; // Smaller base size, slightly varied
                const x = (Math.random() * canvas.width);
                const y = (Math.random() * canvas.height);
                const directionX = (Math.random() * 0.6) - 0.3; // Faster movement
                const directionY = (Math.random() * 0.6) - 0.3; // Faster movement
                const color = baseColors[Math.floor(Math.random() * baseColors.length)]; // Random base color

                particlesArray.push(new Particle(x, y, directionX, directionY, size, color));
            }
        }

        function connect() {
            const maxDistance = 120; // Max distance for lines to connect (adjusted)
            for (let a = 0; a < particlesArray.length; a++) {
                for (let b = a; b < particlesArray.length; b++) {
                    const dx = particlesArray[a].x - particlesArray[b].x;
                    const dy = particlesArray[a].y - particlesArray[b].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < maxDistance) {
                        let opacityValue = 1 - (distance / maxDistance); // Opacity based on distance
                        ctx.strokeStyle = `rgba(255, 255, 255, ${opacityValue * 0.4})`; // Lines are a bit fainter white
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
            init(); // Reinitialize particles on resize
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

        window.addEventListener('resize', handleResize);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseout', handleMouseOut); // Clear mouse position when it leaves

        return () => {
            window.removeEventListener('resize', handleResize);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseout', handleMouseOut);
            cancelAnimationFrame(animationFrameId);
        };
    }, []); // Empty dependency array means this runs once on mount

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
    // Style for the logo image
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
    const inputStyle = { width: '100%', padding: '12px', border: '1px solid #D5D5D5', borderRadius: '8px', fontSize: '14px', color: '#000929', marginTop: '0.5rem', boxSizing: 'border-box' };
    const labelStyle = { display: 'block', textAlign: 'left', color: '#6C727F', fontSize: '12px', fontWeight: '500' };
    const buttonStyle = { width: '100%', padding: '12px', border: 'none', borderRadius: '8px', backgroundColor: '#296bd5ff', color: 'white', fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginTop: '1.5rem' };
    const errorStyle = { color: '#D5292B', fontSize: '12px', marginTop: '1rem', height: '14px' };
    const loginHelpButtonStyle = { position: 'absolute', top: '2rem', right: '2rem', backgroundColor: '#FFFFFF', border: '1px solid #D5D5D5', borderRadius: '8px', padding: '8px 16px', color: '#000929', fontSize: '12px', fontWeight: '700', cursor: 'pointer' };
    const subtitleStyle = { color: '#FFFFFF', opacity: 0.8, fontSize: '14px', fontWeight: '500', marginTop: '4px' };

    return (
        <div style={pageStyle}>
            <div style={leftPanelStyle}>
                <canvas ref={canvasRef} style={canvasStyle} />
                <div style={overlayContentStyle}>
                    {/* Use process.env.PUBLIC_URL to reference the image from the public folder */}
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