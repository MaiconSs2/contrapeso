import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
    const { login, isAuthed } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    if (isAuthed) return <Navigate to="/" replace />;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await login(email.trim(), password);
            navigate('/');
        } catch (err) {
            setError('E-mail ou senha inválidos. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-background px-4 py-10">
            <Helmet>
                <title>Entrar — Contrapeso</title>
                <meta
                    name="description"
                    content="Acesse o Contrapeso para lançar entradas e saídas, categorizar transações e acompanhar sua carteira de investimentos."
                />
            </Helmet>

            <div
                aria-hidden="true"
                className="absolute -right-16 top-10 h-56 w-56 rotate-12 bg-accent"
            />
            <div
                aria-hidden="true"
                className="absolute -bottom-20 -left-10 h-64 w-64 -rotate-6 border-2 border-foreground/15"
            />

            <div className="relative w-full max-w-md">
                <div className="mb-8 flex items-center gap-2.5">
                    <span className="block h-4 w-4 bg-accent" aria-hidden="true" />
                    <span className="text-lg font-bold tracking-tight">Contrapeso</span>
                </div>

                <div className="rounded-xl border border-border bg-card p-8">
                    <h1 className="font-serif text-3xl italic leading-tight">
                        Entrar na sua conta
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Suas finanças e sua carteira, no mesmo eixo.
                    </p>

                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="login-email">E-mail</Label>
                            <Input
                                id="login-email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="voce@exemplo.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="login-password">Senha</Label>
                            <Input
                                id="login-password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Sua senha"
                            />
                        </div>

                        {error && <p className="text-sm font-medium text-negative">{error}</p>}

                        <Button type="submit" disabled={loading} className="h-11 w-full">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Entrar
                        </Button>
                    </form>
                </div>

                <p className="mt-6 text-center text-sm text-muted-foreground">
                    Ainda não tem conta?{' '}
                    <Link to="/cadastro" className="font-semibold text-foreground underline decoration-accent decoration-2 underline-offset-4">
                        Criar conta
                    </Link>
                </p>
            </div>
        </div>
    );
}
