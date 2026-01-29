'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function LandingPage() {

  const handleLogin = () => {
    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const apibaseUrl = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const redirect_uri = process.env.NEXT_PUBLIC_REDIRECT_URI;
    console.log(apibaseUrl)
    
    if (!apibaseUrl) {
      console.error('Google Client ID is not configured');
      return;
    }
    
    if (!redirect_uri) {
      console.error('Redirect URI is not configured');
      return;
    }

    const options = {
      redirect_uri: redirect_uri, // 必须匹配
      client_id: apibaseUrl,
      access_type: 'offline',
      response_type: 'code',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
        // 'openid' 是 id_token 必须的，通常包含在上述 scope 中，显式加上更好
        'openid' 
      ].join(' '),
    };

    const qs = new URLSearchParams(options).toString();
    window.location.href = `${rootUrl}?${qs}`;
  };

  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="relative overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0F0F23]/80 backdrop-blur-md border-b border-[#00FF88]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00FF88] to-[#00CC6F] flex items-center justify-center shadow-lg shadow-[#00FF88]/30">
                <svg className="w-6 h-6 text-[#0F0F23]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-2xl font-bold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                snatch it
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-300 hover:text-[#00FF88] transition-colors duration-200 cursor-pointer">
                Features
              </a>
              <a href="#how-it-works" className="text-gray-300 hover:text-[#00FF88] transition-colors duration-200 cursor-pointer">
                How It Works
              </a>
              <a href="#pricing" className="text-gray-300 hover:text-[#00FF88] transition-colors duration-200 cursor-pointer">
                Pricing
              </a>
              <Link 
                href="/dashboard" 
                className="px-4 py-2 rounded-lg border border-[#00FF88] text-[#00FF88] hover:bg-[#00FF88] hover:text-[#0F0F23] transition-all duration-200 cursor-pointer font-medium"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background Grid */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(#00FF88 1px, transparent 1px), linear-gradient(90deg, #00FF88 1px, transparent 1px)',
            backgroundSize: '50px 50px',
            transform: `translateY(${scrollY * 0.5}px)`,
          }}></div>
        </div>

        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00FF88]/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#7C3AED]/10 rounded-full blur-3xl"></div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-20">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00FF88]/10 border border-[#00FF88]/30 mb-8">
            <div className="w-2 h-2 rounded-full bg-[#00FF88] animate-pulse"></div>
            <span className="text-sm text-[#00FF88] font-medium">Now Live • Join 10,000+ Users</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            <span className="text-white">1 Token</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00FF88] to-[#00CC6F]">
              1 Shot
            </span>
            <br />
            <span className="text-white">All Yours.</span>
          </h1>

          {/* Subheading */}
          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto" style={{ fontFamily: 'Exo 2, sans-serif' }}>
            The fastest way to claim exclusive rewards. One token, one chance, infinite possibilities.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            {/* Google Sign In Button */}
            <button onClick={handleLogin}  className="group relative px-8 py-4 rounded-lg bg-white hover:bg-gray-100 text-gray-900 font-semibold transition-all duration-200 cursor-pointer shadow-lg shadow-white/20 flex items-center gap-3 min-w-[260px] justify-center">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Sign in with Google</span>
            </button>

            <Link 
              href="/dashboard"
              className="px-8 py-4 rounded-lg bg-gradient-to-r from-[#00FF88] to-[#00CC6F] text-[#0F0F23] font-semibold hover:shadow-lg hover:shadow-[#00FF88]/50 transition-all duration-200 cursor-pointer min-w-[260px] text-center"
            >
              Explore Dashboard
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div>
              <div className="text-3xl font-bold text-[#00FF88] mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                10K+
              </div>
              <div className="text-sm text-gray-400">Active Users</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#00FF88] mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                $2M+
              </div>
              <div className="text-sm text-gray-400">Rewards Claimed</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#00FF88] mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                99.9%
              </div>
              <div className="text-sm text-gray-400">Success Rate</div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-[#00FF88]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-24 bg-gradient-to-b from-[#0F0F23] to-[#1a1a3e]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              Why Choose <span className="text-[#00FF88]">Snatch It</span>
            </h2>
            <p className="text-gray-400 text-lg" style={{ fontFamily: 'Exo 2, sans-serif' }}>
              Experience the future of reward claiming
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group relative p-8 rounded-2xl bg-[#1a1a3e]/50 border border-[#00FF88]/20 hover:border-[#00FF88] hover:shadow-lg hover:shadow-[#00FF88]/20 transition-all duration-300 cursor-pointer">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#00FF88] to-[#00CC6F] flex items-center justify-center mb-6 shadow-lg shadow-[#00FF88]/30">
                <svg className="w-7 h-7 text-[#0F0F23]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                Lightning Fast
              </h3>
              <p className="text-gray-400" style={{ fontFamily: 'Exo 2, sans-serif' }}>
                Claim your rewards in seconds. No waiting, no delays. Just instant gratification.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group relative p-8 rounded-2xl bg-[#1a1a3e]/50 border border-[#00FF88]/20 hover:border-[#00FF88] hover:shadow-lg hover:shadow-[#00FF88]/20 transition-all duration-300 cursor-pointer">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#00FF88] to-[#00CC6F] flex items-center justify-center mb-6 shadow-lg shadow-[#00FF88]/30">
                <svg className="w-7 h-7 text-[#0F0F23]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                100% Secure
              </h3>
              <p className="text-gray-400" style={{ fontFamily: 'Exo 2, sans-serif' }}>
                Military-grade encryption protects your tokens and rewards at all times.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group relative p-8 rounded-2xl bg-[#1a1a3e]/50 border border-[#00FF88]/20 hover:border-[#00FF88] hover:shadow-lg hover:shadow-[#00FF88]/20 transition-all duration-300 cursor-pointer">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#00FF88] to-[#00CC6F] flex items-center justify-center mb-6 shadow-lg shadow-[#00FF88]/30">
                <svg className="w-7 h-7 text-[#0F0F23]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                Zero Fees
              </h3>
              <p className="text-gray-400" style={{ fontFamily: 'Exo 2, sans-serif' }}>
                Keep 100% of your rewards. No hidden charges, no transaction fees.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="relative py-24 bg-[#1a1a3e]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              How It <span className="text-[#00FF88]">Works</span>
            </h2>
            <p className="text-gray-400 text-lg" style={{ fontFamily: 'Exo 2, sans-serif' }}>
              Three simple steps to claim your rewards
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting Lines */}
            <div className="hidden md:block absolute top-16 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#00FF88]/30 to-transparent"></div>

            {/* Step 1 */}
            <div className="relative text-center">
              <div className="inline-flex w-20 h-20 rounded-full bg-gradient-to-br from-[#00FF88] to-[#00CC6F] items-center justify-center mb-6 shadow-lg shadow-[#00FF88]/30 relative z-10">
                <span className="text-3xl font-bold text-[#0F0F23]" style={{ fontFamily: 'Orbitron, sans-serif' }}>1</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                Get Token
              </h3>
              <p className="text-gray-400" style={{ fontFamily: 'Exo 2, sans-serif' }}>
                Sign in with Google and receive your unique token instantly
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative text-center">
              <div className="inline-flex w-20 h-20 rounded-full bg-gradient-to-br from-[#00FF88] to-[#00CC6F] items-center justify-center mb-6 shadow-lg shadow-[#00FF88]/30 relative z-10">
                <span className="text-3xl font-bold text-[#0F0F23]" style={{ fontFamily: 'Orbitron, sans-serif' }}>2</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                Take Shot
              </h3>
              <p className="text-gray-400" style={{ fontFamily: 'Exo 2, sans-serif' }}>
                Use your token to participate in exclusive reward opportunities
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative text-center">
              <div className="inline-flex w-20 h-20 rounded-full bg-gradient-to-br from-[#00FF88] to-[#00CC6F] items-center justify-center mb-6 shadow-lg shadow-[#00FF88]/30 relative z-10">
                <span className="text-3xl font-bold text-[#0F0F23]" style={{ fontFamily: 'Orbitron, sans-serif' }}>3</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-3" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                Claim Reward
              </h3>
              <p className="text-gray-400" style={{ fontFamily: 'Exo 2, sans-serif' }}>
                Win? The reward is yours instantly. No waiting period.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 bg-gradient-to-b from-[#1a1a3e] to-[#0F0F23]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            Ready to <span className="text-[#00FF88]">Snatch</span> Your Rewards?
          </h2>
          <p className="text-xl text-gray-400 mb-10" style={{ fontFamily: 'Exo 2, sans-serif' }}>
            Join thousands of users already claiming exclusive rewards
          </p>
          <button className="group relative px-10 py-5 rounded-lg bg-white hover:bg-gray-100 text-gray-900 font-bold text-lg transition-all duration-200 cursor-pointer shadow-lg shadow-white/20 flex items-center gap-3 mx-auto">
            <svg className="w-7 h-7" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Get Started with Google</span>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 bg-[#0F0F23] border-t border-[#00FF88]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00FF88] to-[#00CC6F] flex items-center justify-center">
                <svg className="w-5 h-5 text-[#0F0F23]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-lg font-bold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                snatch it
              </span>
            </div>
            
            <div className="flex items-center gap-8">
              <a href="#" className="text-gray-400 hover:text-[#00FF88] transition-colors duration-200 cursor-pointer text-sm">
                Privacy Policy
              </a>
              <a href="#" className="text-gray-400 hover:text-[#00FF88] transition-colors duration-200 cursor-pointer text-sm">
                Terms of Service
              </a>
              <a href="#" className="text-gray-400 hover:text-[#00FF88] transition-colors duration-200 cursor-pointer text-sm">
                Contact
              </a>
            </div>
            
            <div className="text-gray-500 text-sm">
              © 2026 Snatch It. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
