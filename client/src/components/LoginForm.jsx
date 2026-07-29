import React, { useState } from 'react';
import { AtSign, Lock, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { loginUser } from '../services/api';

export default function LoginForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    loginIdentifier: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.loginIdentifier || !formData.password) {
      setError('Please fill in both Username / Email and Password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await loginUser(formData);
      if (response.success && response.user) {
        onSuccess(response.user);
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="alert-banner alert-danger">
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{error}</span>
        </div>
      )}

      {/* Username or Email Input */}
      <div className="form-group">
        <label className="form-label font-bold">
          <AtSign size={14} /> Username or Email Address
        </label>
        <div className="input-wrapper">
          <input
            type="text"
            name="loginIdentifier"
            className="form-input font-semibold"
            placeholder="Enter your @username or email"
            value={formData.loginIdentifier}
            onChange={handleChange}
            required
          />
          <AtSign className="input-icon" size={18} />
        </div>
      </div>

      {/* Password Input */}
      <div className="form-group">
        <label className="form-label font-bold">
          <Lock size={14} /> Password
        </label>
        <div className="input-wrapper">
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            className="form-input font-semibold"
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <Lock className="input-icon" size={18} />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            title={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <button type="submit" className="btn-primary font-extrabold" disabled={loading}>
        {loading ? (
          <>
            <div className="spinner"></div> Signing In...
          </>
        ) : (
          <>
            <LogIn size={20} /> Sign In to Chat
          </>
        )}
      </button>
    </form>
  );
}
