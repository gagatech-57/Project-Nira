import React, { useState } from 'react';
import { User, AtSign, Mail, Phone, Calendar, Lock, Eye, EyeOff, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { registerUser } from '../services/api';

export default function RegisterForm({ onSuccess, switchToLogin }) {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    gender: 'M',
    age: '',
    mobile: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleChange = (e) => {
    let value = e.target.value;
    if (e.target.name === 'username') {
      // Clean username: remove spaces and leading @
      value = value.replace(/\s+/g, '').replace(/^@/, '').toLowerCase();
    }
    setFormData({ ...formData, [e.target.name]: value });
    if (error) setError('');
  };

  const handleGenderSelect = (genderValue) => {
    setFormData({ ...formData, gender: genderValue });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { name, username, email, gender, age, mobile, password } = formData;

    if (!name || !username || !email || !gender || !age || !mobile || !password) {
      setError('Please fill in all fields: Name, Username (@handle), Email, Gender (M/F), Age, Mobile, and Password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const response = await registerUser(formData);
      if (response.success && response.user) {
        setSuccessMsg('Account created successfully! Logging you in...');
        setTimeout(() => {
          onSuccess(response.user);
        }, 800);
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your details.');
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

      {successMsg && (
        <div className="alert-banner alert-success">
          <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Full Name & Username Row */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label font-bold">
            <User size={14} /> Full Name
          </label>
          <div className="input-wrapper">
            <input
              type="text"
              name="name"
              className="form-input font-semibold"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleChange}
              required
            />
            <User className="input-icon" size={18} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label font-bold">
            <AtSign size={14} /> Username
          </label>
          <div className="input-wrapper">
            <input
              type="text"
              name="username"
              className="form-input font-semibold"
              placeholder="Enter your @username"
              value={formData.username}
              onChange={handleChange}
              required
            />
            <AtSign className="input-icon" size={18} />
          </div>
        </div>
      </div>

      {/* Email */}
      <div className="form-group">
        <label className="form-label font-bold">
          <Mail size={14} /> Email Address
        </label>
        <div className="input-wrapper">
          <input
            type="email"
            name="email"
            className="form-input font-semibold"
            placeholder="Enter your email address"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <Mail className="input-icon" size={18} />
        </div>
      </div>

      {/* Gender Selection (M / F / Other) */}
      <div className="form-group">
        <label className="form-label font-bold">
          <User size={14} /> Gender
        </label>
        <div className="gender-selector">
          <button
            type="button"
            className={`gender-btn ${formData.gender === 'M' ? 'active' : ''}`}
            onClick={() => handleGenderSelect('M')}
          >
            <span>Male (M)</span>
          </button>
          <button
            type="button"
            className={`gender-btn ${formData.gender === 'F' ? 'active' : ''}`}
            onClick={() => handleGenderSelect('F')}
          >
            <span>Female (F)</span>
          </button>
          <button
            type="button"
            className={`gender-btn ${formData.gender === 'Other' ? 'active' : ''}`}
            onClick={() => handleGenderSelect('Other')}
          >
            <span>Other</span>
          </button>
        </div>
      </div>

      {/* Age & Mobile Row */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label font-bold">
            <Calendar size={14} /> Age
          </label>
          <div className="input-wrapper">
            <input
              type="number"
              name="age"
              min="10"
              max="120"
              className="form-input font-semibold"
              placeholder="Enter your age"
              value={formData.age}
              onChange={handleChange}
              required
            />
            <Calendar className="input-icon" size={18} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label font-bold">
            <Phone size={14} /> Mobile
          </label>
          <div className="input-wrapper">
            <input
              type="tel"
              name="mobile"
              className="form-input font-semibold"
              placeholder="Enter your mobile number"
              value={formData.mobile}
              onChange={handleChange}
              required
            />
            <Phone className="input-icon" size={18} />
          </div>
        </div>
      </div>

      {/* Password Input */}
      <div className="form-group">
        <label className="form-label font-bold">
          <Lock size={14} /> Create Password
        </label>
        <div className="input-wrapper">
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            className="form-input font-semibold"
            placeholder="Enter your password (min 6 chars)"
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
            <div className="spinner"></div> Creating Account...
          </>
        ) : (
          <>
            <UserPlus size={20} /> Create New Account
          </>
        )}
      </button>
    </form>
  );
}
