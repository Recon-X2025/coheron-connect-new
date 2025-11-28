import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { apiService } from '../services/apiService';
import { AuthenticationError } from '../services/errorHandler';
import { LoadingSpinner } from '../components/LoadingSpinner';
import './Auth.css';

export const Login: React.FC = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [database, setDatabase] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            // Try new API first, fallback to Odoo if needed
            try {
                await apiService.login(username, password);
                navigate('/dashboard');
            } catch (apiError) {
                // Fallback to Odoo authentication
                await authService.login({
                    username,
                    password,
                    database: database || undefined,
                });
                navigate('/dashboard');
            }
        } catch (err) {
            if (err instanceof AuthenticationError) {
                setError(err.message);
            } else {
                setError('Invalid credentials. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-header">
                    <h1>Coheron ERP</h1>
                    <p>Sign in to your account</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {error && (
                        <div className="auth-error">
                            {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="database">Database</label>
                        <input
                            id="database"
                            type="text"
                            value={database}
                            onChange={(e) => setDatabase(e.target.value)}
                            placeholder="Database name (optional)"
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your username"
                            required
                            disabled={loading}
                            autoComplete="username"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            required
                            disabled={loading}
                            autoComplete="current-password"
                        />
                    </div>

                    <button
                        type="submit"
                        className="auth-button"
                        disabled={loading || !username || !password}
                    >
                        {loading ? <LoadingSpinner size="small" /> : 'Sign In'}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>
                        Need help? <a href="/support">Contact Support</a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
