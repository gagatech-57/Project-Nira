import React, { useState } from 'react';
import { MessageSquare, LogIn, UserPlus } from 'lucide-react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

export default function AuthPage({ onLoginSuccess }) {
  const [activeTab, setActiveTab] = useState('login'); // 'login' or 'register'

  return (
    <div className="auth-card">
      <div className="auth-header">
        <div className="auth-logo">
          <MessageSquare size={20} />
          <span>NIRA CHAT</span>
        </div>
        <h1 className="auth-title">
          {activeTab === 'login' ? 'Welcome Back' : 'Create Account'}
        </h1>
        <p className="auth-subtitle">
          {activeTab === 'login'
            ? 'Sign in to access your real-time chat workspace'
            : 'Fill in your details to start chatting with friends'}
        </p>
      </div>

      {/* Tabs */}
      <div className="tab-container">
        <button
          className={`tab-btn ${activeTab === 'login' ? 'active' : ''}`}
          onClick={() => setActiveTab('login')}
        >
          <LogIn size={16} /> Sign In
        </button>
        <button
          className={`tab-btn ${activeTab === 'register' ? 'active' : ''}`}
          onClick={() => setActiveTab('register')}
        >
          <UserPlus size={16} /> Create Account
        </button>
      </div>

      {/* Dynamic Form Content */}
      {activeTab === 'login' ? (
        <LoginForm onSuccess={onLoginSuccess} />
      ) : (
        <RegisterForm
          onSuccess={onLoginSuccess}
          switchToLogin={() => setActiveTab('login')}
        />
      )}
    </div>
  );
}
