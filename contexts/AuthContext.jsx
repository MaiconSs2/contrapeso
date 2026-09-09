import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import pb from '@/lib/pocketbaseClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(pb.authStore.record);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange((_token, record) => {
      setUser(record);
      setLoading(false);
    });
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => { unsubscribe(); clearTimeout(timer); };
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    isAuthed: pb.authStore.isValid,
    login: (email, password) => pb.collection('users').authWithPassword(email, password),
    signup: async (email, password, extraFields = {}) => {
      const result = await pb.collection('users').create({ email, password, passwordConfirm: password, ...extraFields });
      if (!pb.authStore.isValid) {
        return { ...result, needsEmailConfirmation: true };
      }
      return pb.collection('users').authWithPassword(email, password);
    },
    logout: () => pb.authStore.clear(),
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
