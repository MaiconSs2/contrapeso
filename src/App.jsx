import React from 'react';
import { Route, Routes, BrowserRouter as Router, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import ScrollToTop from '@/components/ScrollToTop';
import AppLayout from '@/components/AppLayout';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import DashboardPage from '@/pages/DashboardPage';
import TransactionsPage from '@/pages/TransactionsPage';
import AccountsPage from '@/pages/AccountsPage';
import InvestmentsPage from '@/pages/InvestmentsPage';
import CreditCardsPage from '@/pages/CreditCardsPage';

function App() {
    return (
        <AuthProvider>
            <Router>
                <ScrollToTop />
                <Toaster position="top-right" />
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/cadastro" element={<SignupPage />} />
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <AppLayout>
                                    <DashboardPage />
                                </AppLayout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/transacoes"
                        element={
                            <ProtectedRoute>
                                <AppLayout>
                                    <TransactionsPage />
                                </AppLayout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/investimentos"
                        element={
                            <ProtectedRoute>
                                <AppLayout>
                                    <InvestmentsPage />
                                </AppLayout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/cartoes"
                        element={
                            <ProtectedRoute>
                                <AppLayout>
                                    <CreditCardsPage />
                                </AppLayout>
                            </ProtectedRoute>
                        }
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
