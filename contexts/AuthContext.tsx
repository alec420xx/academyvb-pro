import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    User,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    authError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);

    // Listen for auth state changes
    useEffect(() => {
        console.log('AuthProvider: Setting up auth listener');

        // Add timeout in case Firebase auth hangs
        const timeout = setTimeout(() => {
            console.warn('AuthProvider: Auth initialization timeout, continuing anyway');
            setLoading(false);
        }, 10000); // 10 second timeout

        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            console.log('AuthProvider: Auth state changed', currentUser?.email || 'No user');
            clearTimeout(timeout);
            setUser(currentUser);
            setLoading(false);
        }, (error) => {
            console.error('AuthProvider: Auth state error', error);
            clearTimeout(timeout);
            setAuthError(error.message);
            setLoading(false);
        });

        return () => {
            clearTimeout(timeout);
            unsubscribe();
        };
    }, []);

    const signInWithGoogle = async () => {
        try {
            setAuthError(null);
            console.log('AuthProvider: Starting Google sign-in...');
            const result = await signInWithPopup(auth, googleProvider);
            console.log('AuthProvider: Sign-in successful', result.user.email);
        } catch (error: any) {
            console.error("AuthProvider: Sign-in error", error.code, error.message);
            setAuthError(error.message || 'Sign-in failed');
            throw error;
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600 mx-auto mb-4"></div>
                    <p className="text-slate-400 text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ user, loading, signInWithGoogle, logout, authError }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
