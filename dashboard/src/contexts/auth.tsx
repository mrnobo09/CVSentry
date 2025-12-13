import {createContext,useContext,useState, useEffect} from "react"
import type { authContextType } from "../types/auth"
import request from "../utils/request"

const AuthContext = createContext<authContextType | null>(null)

export function AuthProvider({children}: {children: React.ReactNode}){

    const [isAuthenticated,setIsAuthenticated] = useState<boolean>(false)

    useEffect(() => {
        const checkAuth = async () => {
            try{
                const user = await request.get('/auth/users/me/')
                //console.log(user)
                if(user.id){
                    setIsAuthenticated(true)
                    //console.log(`User is authenticated : ${isAuthenticated}`)
                }else{
                    setIsAuthenticated(false)
                }
            }catch{
                setIsAuthenticated(false)
            }
        }
        checkAuth()
    })

    

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