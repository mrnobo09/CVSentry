import { createContext, useContext, useState, useEffect, useCallback } from "react"
import type { authContextType } from "../types/auth"
import request, { setAccessToken } from "../utils/request"

const AuthContext = createContext<authContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {

    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

    const checkAuth = useCallback(async () => {
        try {
            const user = await request.get('/auth/users/me/')
            if (user.id) {
                setIsAuthenticated(true)
            } else {
                setIsAuthenticated(false)
            }
        } catch {
            setIsAuthenticated(false)
        }
    }, [])

    const logout = useCallback(async () => {
        try {
            // Blacklist the refresh token (cookie-based — Django handles it)
            await request.post('/auth/token/blacklist/')
        } catch { /* ignore */ }
        setAccessToken(null)
        setIsAuthenticated(false)
    }, [])

    useEffect(() => {
        checkAuth()
    }, [checkAuth])

    return (
        <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated, checkAuth, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) throw new Error("useAuth must be used within an AuthenticatedProvider")
    return context
}