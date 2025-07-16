// src/WelcomePage.js
import React, { useState, useEffect } from 'react';
// import { Link } from 'react-router-dom'; // Keep this if you use React Router Links

const WelcomePage = () => {
    // --- Responsive State & Logic ---
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isMobile = windowWidth <= 768;
    const isTablet = windowWidth <= 992;
    const isLargeDesktop = windowWidth <= 1200;

    // --- Image Paths (ensure these are correct relative to your public folder) ---
    // Updated logo path based on your provided absolute path for C_Lab Logo.png
    const logoSrc = `${process.env.PUBLIC_URL}/C_Lab Logo.png`;
    const heroBgSrc = `${process.env.PUBLIC_URL}/eae123d71b02e34da63aec2a6f8ecd450165c106.png`;

    // --- Inline Style Objects ---

    const globalBodyStyle = {
        margin: 0,
        padding: 0,
        fontFamily: "'Poly', sans-serif",
        backgroundColor: '#ffffff',
        color: 'rgba(0, 0, 0, 0.78)',
        boxSizing: 'border-box',
    };
    const containerStyle = {
        maxWidth: '1440px',
        marginLeft: 'auto',
        marginRight: 'auto',
        paddingLeft: '15px',
        paddingRight: '15px',
        ...(isTablet && { paddingLeft: '10px', paddingRight: '10px' }),
        ...(isMobile && { paddingLeft: '5px', paddingRight: '5px' }),
    };
    const linkBaseStyle = {
        textDecoration: 'none',
        color: 'inherit',
    };
    const ulBaseStyle = {
        margin: 0,
        padding: 0,
        listStyle: 'none',
    };

    // Header Styles
    const siteHeaderStyle = {
        backgroundColor: '#ffffff',
        paddingTop: '15px',
        paddingBottom: '15px',
        ...(isLargeDesktop && { paddingLeft: '10px', paddingRight: '10px' }),
        ...(isMobile && { paddingLeft: '5px', paddingRight: '5px', paddingTop: '10px', paddingBottom: '10px' }),
    };
    const headerContainerStyle = {
        ...containerStyle,
        display: 'flex',
        flexDirection: 'column',
    };
    const headerTopStyle = {
        display: 'flex',
        justifyContent: 'flex-end',
        width: '100%',
        marginBottom: '10px',
        ...(isMobile && { justifyContent: 'center', marginBottom: '8px' }),
    };
    const locationNavUlStyle = {
        ...ulBaseStyle,
        display: 'flex',
        gap: '15px',
        ...(isMobile && { gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }),
    };
    const locationNavAStyle = {
        fontFamily: "'Crimson Text', serif",
        fontSize: '16px',
        fontWeight: 400,
        color: '#000000',
        letterSpacing: '0.6px',
        ...linkBaseStyle,
    };
    const headerMainStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        gap: '30px', // Increased gap for better separation
        ...(isMobile && { flexWrap: 'wrap', justifyContent: 'center', gap: '10px' }),
    };
    const logoBaseStyle = {
        width: '200px', // Adjusted to match the provided logo image scale
        height: 'auto',
        display: 'block',
        // Optional: Filter for subtle shadow or brightness if desired for image
        // filter: 'drop-shadow(2px 2px 2px rgba(0,0,0,0.1))',
        ...(isMobile && { width: '150px', margin: '0 auto', order: -1, textAlign: 'center' }),
    };
    const mainNavBaseStyle = {
        ...(isLargeDesktop && { display: 'none' }),
    };
    const mainNavUlStyle = {
        ...ulBaseStyle,
        display: 'flex',
        gap: '20px',
    };
    const mainNavAStyle = {
        fontFamily: "'Crimson Text', serif",
        fontSize: '16px',
        fontWeight: 400,
        color: '#000000',
        letterSpacing: '0.6px',
        ...linkBaseStyle,
    };
    const ctaButtonStyle = {
        background: '#dc2626', // Changed to RED
        color: '#ffffff',
        fontFamily: "'Crimson Text', serif",
        fontSize: '18px', // Reduced
        fontWeight: 700,
        padding: '8px 30px', // Slightly increased padding for better feel
        borderRadius: '5px',
        textAlign: 'center',
        letterSpacing: '0.7px',
        whiteSpace: 'nowrap',
        ...linkBaseStyle,
        // Subtle hover effect (more complex for inline)
        // onMouseOver: (e) => e.currentTarget.style.backgroundColor = '#b01f1f',
        // onMouseLeave: (e) => e.currentTarget.style.backgroundColor = '#dc2626',
    };

    // Hero Section Styles
    const heroSectionStyle = {
        position: 'relative',
        padding: '60px 0',
        overflow: 'hidden',
        ...(isMobile && { padding: '30px 0', textAlign: 'center' }),
    };
    const heroBackgroundStyle = {
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '1440px',
        height: '450px',
        zIndex: -1,
        ...(isMobile && { height: '280px' }),
    };
    const heroBackgroundImgStyle = {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    };
    const heroContentStyle = {
        maxWidth: '900px',
        padding: '30px 0',
        ...(isMobile && { margin: '0 auto' }),
    };
    const heroTitleStyle = {
        fontFamily: "'Crimson Text', serif",
        fontSize: '36px',
        fontWeight: 700,
        color: '#0f3374',
        letterSpacing: '1.3px',
        marginTop: 0,
        marginBottom: '12px',
        ...(isMobile && { fontSize: '30px', marginBottom: '8px' }),
    };
    const heroTextStyle = {
        fontFamily: "'Poly', sans-serif",
        fontSize: '18px',
        color: 'rgba(0, 0, 0, 0.78)',
        lineHeight: 1.4,
        letterSpacing: '1.3px',
        marginBottom: '15px',
        ...(isMobile && { fontSize: '15px', marginBottom: '10px' }),
    };
    const heroButtonStyle = {
        display: 'inline-block',
        background: '#dc2626',
        color: '#ffffff',
        fontFamily: "'Rozha One', serif",
        fontSize: '24px',
        fontWeight: 400,
        padding: '10px 30px',
        borderRadius: '20px',
        letterSpacing: '0.2px',
        textAlign: 'center',
        ...linkBaseStyle,
        ...(isMobile && { fontSize: '18px', padding: '8px 20px' }),
    };

    // Footer Styles
    const siteFooterStyle = {
        backgroundColor: '#36548b',
        color: '#ffffff',
        padding: '40px 0',
    };
    const footerContainerStyle = {
        ...containerStyle,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '20px',
        ...(isTablet && { flexDirection: 'column', alignItems: 'center', textAlign: 'center' }),
    };
    const footerLogoImgStyle = {
        width: '150px',
        height: 'auto',
        // Optional: Filter for subtle shadow or brightness if desired for image
        // filter: 'brightness(1.2) drop-shadow(0px 0px 5px rgba(255,255,255,0.2))',
    };
    const footerNavStyle = {
        display: 'flex',
        gap: '25px', // Reduced gap for compactness
        ...(isTablet && { flexDirection: 'column', gap: '15px', marginTop: '20px' }),
        ...(isMobile && { width: '100%' }),
    };
    const footerColumnH3Style = {
        fontFamily: "'Playfair Display', serif",
        fontSize: '18px', // Reduced
        fontWeight: 700,
        marginTop: 0,
        marginBottom: '8px', // Reduced
        letterSpacing: '1.2px', // Adjusted
        color: '#ffffff',
        ...(isMobile && { fontSize: '16px', marginBottom: '6px' }), // Reduced
    };
    const footerColumnUlStyle = {
        ...ulBaseStyle,
    };
    const footerColumnLiStyle = {
        marginBottom: '4px', // Reduced
    };
    const footerColumnAStyle = {
        fontFamily: "'Poly', sans-serif",
        fontSize: '13px', // Reduced significantly
        letterSpacing: '1.2px', // Adjusted
        color: '#ffffff',
        ...linkBaseStyle,
        ...(isMobile && { fontSize: '11px' }), // Reduced
    };


    return (
        <div style={globalBodyStyle}>
            {/* Header */}
            <header id="header" style={siteHeaderStyle}>
                <div style={headerContainerStyle}>
                    <div style={headerTopStyle}>
                        <nav style={{ /* location-nav */ }}>
                            <ul style={locationNavUlStyle}>
                                <li><a href="#" style={locationNavAStyle}>INDIA</a></li>
                                <li><a href="#" style={locationNavAStyle}>CANADA</a></li>
                                <li><a href="#" style={locationNavAStyle}>MIDDLE EAST</a></li>
                                <li><a href="#" style={locationNavAStyle}>USA</a></li>
                            </ul>
                        </nav>
                    </div>
                    <div style={headerMainStyle}>
                        <a href="#" style={isMobile ? { order: -1, width: '100%', textAlign: 'center', ...linkBaseStyle } : linkBaseStyle}>
                            <img src={logoSrc} alt="Cirrus Labs Logo" style={logoBaseStyle} />
                        </a>
                        <nav style={mainNavBaseStyle}>
                            <ul style={mainNavUlStyle}>
                                <li><a href="#" style={mainNavAStyle}>Solutions</a></li>
                                <li><a href="#" style={mainNavAStyle}>Services</a></li>
                                <li><a href="#" style={mainNavAStyle}>Resources</a></li>
                                <li><a href="#" style={mainNavAStyle}>Company</a></li>
                            </ul>
                        </nav>
                        <a href="/login" style={ctaButtonStyle}>Contact us</a>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section id="hero" style={heroSectionStyle}>
                <div style={heroBackgroundStyle}>
                    <img src={heroBgSrc} alt="Dotted background pattern" style={heroBackgroundImgStyle} />
                </div>
                <div style={containerStyle}>
                    <div style={heroContentStyle}>
                        <h1 style={heroTitleStyle}>Welcome To AssetTracker</h1>
                        <p style={heroTextStyle}>
                            Your IT Assets. End-to-end IT asset tracking, auditing, and life cycle management in one powerful platform.
                            <br/><br/>
                            Take Control of Your IT Assets with Smart, Scalable Management.
                            Optimize your hardware, software, and digital resources — all in one place.
                            Reduce costs, improve security, and stay audit-ready with our powerful IT Asset Management solutions.
                        </p>
                        <a href="/login" style={heroButtonStyle}>Get Started</a>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer id="footer" style={siteFooterStyle}>
                <div style={footerContainerStyle}>
                    <div> {/* footer-logo container */}
                        <a href="#" style={linkBaseStyle}>
                            <img src={logoSrc} alt="Cirrus Labs Logo" style={footerLogoImgStyle} />
                        </a>
                    </div>
                    <div style={footerNavStyle}>
                        <div> {/* footer-column 1 */}
                            <h3 style={footerColumnH3Style}>Solutions</h3>
                            <ul style={ulBaseStyle}>
                                <li style={footerColumnLiStyle}><a href="#" style={footerColumnAStyle}>Asset Tracking</a></li>
                                <li style={footerColumnLiStyle}><a href="#" style={footerColumnAStyle}>Lifestyle Management</a></li>
                                <li style={footerColumnLiStyle}><a href="#" style={footerColumnAStyle}>Reporting</a></li>
                            </ul>
                        </div>
                        <div> {/* footer-column 2 */}
                            <h3 style={footerColumnH3Style}>Resources</h3>
                            <ul style={ulBaseStyle}>
                                <li style={footerColumnLiStyle}><a href="#" style={footerColumnAStyle}>Documentation</a></li>
                                <li style={footerColumnLiStyle}><a href="#" style={footerColumnAStyle}>Support</a></li>
                                <li style={footerColumnLiStyle}><a href="#" style={footerColumnAStyle}>Blog</a></li>
                            </ul>
                        </div>
                        <div> {/* footer-column 3 */}
                            <h3 style={footerColumnH3Style}>Company</h3>
                            <ul style={ulBaseStyle}>
                                <li style={footerColumnLiStyle}><a href="#" style={footerColumnAStyle}>About Us</a></li>
                                <li style={footerColumnLiStyle}><a href="#" style={footerColumnAStyle}>Contact</a></li>
                                <li style={footerColumnLiStyle}><a href="#" style={footerColumnAStyle}>Careers</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default WelcomePage;