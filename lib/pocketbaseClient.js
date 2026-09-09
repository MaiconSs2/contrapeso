import { supabase } from './supabase';

const normalizeUser = (user) => user ? ({
  id: user.id,
  email: user.email,
  name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
  ...user.user_metadata,
}) : null;

const listeners = new Set();
let currentSession = null;
let currentUser = null;

supabase.auth.getSession().then(({ data }) => {
  currentSession = data.session;
  currentUser = normalizeUser(data.session?.user);
  listeners.forEach((cb) => cb(currentSession?.access_token || '', currentUser));
});

supabase.auth.onAuthStateChange((_event, session) => {
  currentSession = session;
  currentUser = normalizeUser(session?.user);
  listeners.forEach((cb) => cb(session?.access_token || '', currentUser));
});

const allowedTables = ['accounts', 'transactions', 'investments', 'credit_cards', 'card_purchases', 'card_invoices'];
const tableName = (name) => {
  if (!allowedTables.includes(name)) throw new Error(`Coleção inválida: ${name}`);
  return name;
};

const collection = (name) => {
  const table = tableName(name);
  return {
    async getFullList({ sort } = {}) {
      if (!currentSession?.user) throw new Error('Sessão expirada. Faça login novamente.');
      let query = supabase.from(table).select('*').eq('user_id', currentSession.user.id);
      if (sort) {
        const descending = sort.startsWith('-');
        const column = sort.replace(/^-/, '');
        query = query.order(column, { ascending: !descending });
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    async create(payload) {
      if (!currentSession?.user) throw new Error('Sessão expirada.');
      const { data, error } = await supabase.from(table)
        .insert({ ...payload, user_id: currentSession.user.id })
        .select('*').single();
      if (error) throw error;
      return data;
    },
    async update(id, payload) {
      if (!currentSession?.user) throw new Error('Sessão expirada.');
      const { data, error } = await supabase.from(table)
        .update(payload)
        .eq('id', id)
        .eq('user_id', currentSession.user.id)
        .select('*').single();
      if (error) throw error;
      return data;
    },
    async delete(id) {
      if (!currentSession?.user) throw new Error('Sessão expirada.');
      const { error } = await supabase.from(table)
        .delete().eq('id', id).eq('user_id', currentSession.user.id);
      if (error) throw error;
      return true;
    },
  };
};

const pb = {
  authStore: {
    get record() { return currentUser; },
    get isValid() { return Boolean(currentSession?.access_token); },
    onChange(callback) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    async clear() { await supabase.auth.signOut(); },
  },
  collection(name) {
    if (name === 'users') {
      return {
        async authWithPassword(email, password) {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          return { record: normalizeUser(data.user), token: data.session?.access_token };
        },
        async create({ email, password, passwordConfirm, name }) {
          if (password !== passwordConfirm) throw new Error('As senhas não coincidem.');
          const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
          if (error) throw error;
          return normalizeUser(data.user);
        },
      };
    }
    return collection(name);
  },
};

export default pb;
