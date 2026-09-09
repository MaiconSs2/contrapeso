import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SignupPage() {
    const { signup, isAuthed } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    if (isAuthed) return <Navigate to="/" replace />;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password.length < 10) {
            return setError('A senha deve ter pelo menos 10 caracteres.');
        }
        if (password !== confirm) {
            return setError('As senhas não coincidem.');
        }
        setLoading(true);
        setError('');
        try {
            const result = await signup(email.trim(), password, { name: name.trim() });
            if (result?.needsEmailConfirmation) {
                setError('Conta criada. Verifique seu e-mail para confirmar a conta e depois entre.');
                return;
            }
            navigate('/');
        } catch (err) {
            setError('Não foi possível criar a conta. Verifique os dados e tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-background px-4 py-10">
            <Helmet>
                <title>Criar conta — Contrapeso</title>
                <meta
                    name="description"
                    content="Crie sua conta no Contrapeso e comece a organizar entradas, saídas e investimentos em um só lugar."
                />
            </Helmet>

            <div
                aria-hidden="true"
                className="absolute -left-16 top-16 h-56 w-56 -rotate-12 bg-accent"
            />
            <div
                aria-hidden="true"
                className="absolute -bottom-16 right-0 h-64 w-64 rotate-6 border-2 border-foreground/15"
            />

            <div className="relative w-full max-w-md">
                <div className="mb-8 flex items-center gap-2.5">
                    <span className="block h-4 w-4 bg-accent" aria-hidden="true" />
                    <span className="text-lg font-bold tracking-tight">Contrapeso</span>
                </div>

                <div className="rounded-xl border border-border bg-card p-8">
                    <h1 className="font-serif text-3xl italic leading-tight">Criar sua conta</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Gratuita, sem planos pagos — só você e seus números.
                    </p>

                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="signup-name">Nome</Label>
                            <Input
                                id="signup-name"
                                autoComplete="name"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Como devemos te chamar?"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="signup-email">E-mail</Label>
                            <Input
                                id="signup-email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="voce@exemplo.com"
                            />
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="signup-password">Senha</Label>
                                <Input
                                    id="signup-password"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Mín. 10 caracteres"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="signup-confirm">Confirmar senha</Label>
                                <Input
                                    id="signup-confirm"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    placeholder="Repita a senha"
                                />
                            </div>
                        </div>

                        {error && <p className="text-sm font-medium text-negative">{error}</p>}

                        <Button type="submit" disabled={loading} className="h-11 w-full">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Criar conta
                        </Button>
                    </form>
                </div>

                <p className="mt-6 text-center text-sm text-muted-foreground">
                    Já tem conta?{' '}
                    <Link to="/login" className="font-semibold text-foreground underline decoration-accent decoration-2 underline-offset-4">
                        Entrar
                    </Link>
                </p>
            </div>
        </div>
    );
}
