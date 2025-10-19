import TextInput from "../components/forms/textInput"
import loginBackground from '../assets/Images/loginBackground.jpg'
import CVSentryLogo from '../assets/Images/CVSentryLogo.png'
import {useState} from "react"
import request from "../utils/request"
import type { loginCredentials } from "../types/form"
import SpinnerLoader from "../components/forms/spinnerLoader"



export default function Login(){

    const [isLoading,setIsLoading] = useState<boolean>(false)
    const [message,setMessage] = useState<string>("")

    const [formData,setFormData] = useState<loginCredentials>({
        username: "",
        password: ""
    })

    const handleChange = (field: keyof loginCredentials, value: string) => {
        setFormData({
            ...formData,
            [field]: value
        })
    }

    const handleSubmit = async () => {
        try{
            setIsLoading(true)
            const response = await request.post('/auth/login/', formData);
            if (response.status === 200){
                setMessage("")
            }
        }catch(error: any){
            if(error.response && error.response.status === 401){
                setMessage("Invalid username or password.")
            }else{
            setMessage("An error occurred. Please try again.")
            }
        }finally{
            setIsLoading(false)
        }
        
    }
    
    return(
        <div className="w-screen h-screen grid md:grid-cols-2">
            <img src={loginBackground} className="w-full h-full hidden md:block object-cover" />
            <div className="w-full h-full bg-gradient-to-br from-[#0E1139] to-[#020515]  grid place-items-center ">
                <div className="w-auto h-auto">

                    {/* Header Section */}
                    <div className="text-center md:text-left text-white">
                        <img src={CVSentryLogo} className="w-20 mx-auto mb-4 block md:hidden" />
                        <h1 className="text-[2rem] font-bold">Welcome Back!</h1>
                        <h6>Enter Your Credentials To Sign In</h6>
                    </div>

                    {/* Form Section */}
                    <div className="grid gap-4 mt-8">
                        <div>
                            <label className="text-sm font-semibold">Username</label>
                            <TextInput placeholder="Your username..." value={formData.username} onChange={(value) => handleChange("username", value)} />
                        </div>
                        <div>
                            <label className="text-sm font-semibold">Password</label>
                            <TextInput placeholder="Your password..." type="password" value={formData.password} onChange={(value) => handleChange("password", value)} />
                        </div>
                        <button className="w-full h-10 bg-[#0970F0] text-white grid place-items-center py-2 rounded-lg mt-4 font-semibold hover:scale-105 transition duration-300" onClick={handleSubmit}>{isLoading ? <SpinnerLoader /> : "Sign In"}</button>
                        <p className="text-red">{message}</p>
                    </div>

                </div>
            </div>
        </div>
    )
}