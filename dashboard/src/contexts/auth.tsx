import {createContext,useContext,useState} from "react"
import type { authContextType } from "../types/auth"

const AuthContext = createContext<authContextType | null>(null)

export function AuthProvider({children}: {children: React.ReactNode}){

    const [isAuthenticated,setIsAuthenticated] = useState<boolean>(false)

    return(
        <AuthContext.Provider value={{isAuthenticated,setIsAuthenticated}}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth(){
    const context = useContext(AuthContext)
    if(!context) throw new Error("useAuth must be used within an AuthenticatedProvider")
    return context
}