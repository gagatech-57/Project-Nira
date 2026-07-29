import React, { useState, useEffect } from 'react';
import AuthPage from './components/AuthPage';
import Dashboard from './components/Dashboard';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Check local storage for saved user session
    const savedUser = localStorage.getItem('chat_app_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('chat_app_user');
      }
    }
  }, []);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    localStorage.setItem('chat_app_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('chat_app_user');
  };

  return (
    <div className="app-container">
      {!currentUser ? (
        <AuthPage onLoginSuccess={handleLoginSuccess} />
      ) : (
        <Dashboard user={currentUser} onLogout={handleLogout} />
      )}
    </div>
  );
}
