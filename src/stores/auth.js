import { defineStore } from 'pinia'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    session: null,
    isLoading: false,
    error: '',
    message: '',
    initialized: false,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.session?.user),
    isSupabaseConfigured: () => isSupabaseConfigured,
  },
  actions: {
    async initializeAuth() {
      if (!supabase) {
        this.initialized = true
        return
      }

      this.isLoading = true
      this.error = ''

      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error

        this.session = data.session
        this.user = data.session?.user ?? null

        supabase.auth.onAuthStateChange((_event, session) => {
          this.session = session
          this.user = session?.user ?? null
        })

        if (!this.session && import.meta.env.DEV) {
          const devEmail = import.meta.env.VITE_DEV_AUTH_EMAIL
          const devPassword = import.meta.env.VITE_DEV_AUTH_PASSWORD
          if (devEmail && devPassword) {
            await this.signInWithEmail(devEmail, devPassword)
          }
        }
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Could not initialize auth.'
      } finally {
        this.isLoading = false
        this.initialized = true
      }
    },
    async signInWithEmail(email, password) {
      this.isLoading = true
      this.error = ''
      this.message = ''

      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error

        this.session = data.session
        this.user = data.session?.user ?? null
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Could not sign in.'
        throw error
      } finally {
        this.isLoading = false
      }
    },
    async signUpWithEmail(email, password) {
      this.isLoading = true
      this.error = ''
      this.message = ''

      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        })
        if (error) throw error

        this.session = data.session
        this.user = data.session?.user ?? null
        this.message = data.session ? '' : 'Check your email to confirm your account, then sign in.'
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Could not create account.'
        throw error
      } finally {
        this.isLoading = false
      }
    },
    async signInWithGoogle() {
      this.isLoading = true
      this.error = ''
      this.message = ''

      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin,
          },
        })
        if (error) throw error
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Could not start Google sign-in.'
        throw error
      } finally {
        this.isLoading = false
      }
    },
    async signOut() {
      if (!supabase) return

      this.isLoading = true
      this.error = ''

      try {
        const { error } = await supabase.auth.signOut()
        if (error) throw error

        this.session = null
        this.user = null
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Could not sign out.'
        throw error
      } finally {
        this.isLoading = false
      }
    },
  },
})
