import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import { AuthenticationError } from '../services/errorHandler';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { FormField } from '../components/FormField';
import { useFormValidation, required } from '../hooks/useFormValidation';
import './Auth.css';

export const Login: React.FC = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [database, setDatabase] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const form = useFormValidation(
        { username: '' as string, password: '' as string },
        {
            username: [required('Username is required')],
            password: [required('Password is required')],
        }
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.validate()) return;
        setError(null);
        setLoading(true);

        try {
            try {
                await login(form.values.username, form.values.password);
                navigate('/dashboard');
            } catch (apiError) {
                await authService.login({
                    username: form.values.username,
                    password: form.values.password,
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

                    <FormField label="Database" htmlFor="database">
                        <input
                            id="database"
                            type="text"
                            value={database}
                            onChange={(e) => setDatabase(e.target.value)}
                            placeholder="Database name (optional)"
                            disabled={loading}
                        />
                    </FormField>

                    <FormField
                        label="Username"
                        htmlFor="username"
                        required
                        error={form.errors.username}
                    >
                        <input
                            id="username"
                            type="text"
                            value={form.values.username}
                            onChange={(e) => form.handleChange('username', e.target.value)}
                            onBlur={() => form.handleBlur('username')}
                            placeholder="Enter your username"
                            disabled={loading}
                            autoComplete="username"
                        />
                    </FormField>

                    <FormField
                        label="Password"
                        htmlFor="password"
                        required
                        error={form.errors.password}
                    >
                        <input
                            id="password"
                            type="password"
                            value={form.values.password}
                            onChange={(e) => form.handleChange('password', e.target.value)}
                            onBlur={() => form.handleBlur('password')}
                            placeholder="Enter your password"
                            disabled={loading}
                            autoComplete="current-password"
                        />
                    </FormField>

                    <button
                        type="submit"
                        className="auth-button"
                        disabled={loading || !form.values.username || !form.values.password}
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
