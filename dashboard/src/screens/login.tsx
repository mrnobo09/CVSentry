import TextInput from "../components/forms/textInput"
import loginBackground from '../assets/Images/loginBackground.jpg'
import {useState} from "react"
import request from "../actions/request"
import type { loginCredentials } from "../types/form"


export default function Login(){

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
        console.log(formData);
        const response = await request.post('/auth/login/', formData);
        console.log(response);
    }
    
    return(
        <div className="w-screen h-screen grid grid-cols-2">
            <img src={loginBackground} className="w-full h-full" />
            <div className="w-full h-full bg-gradient-to-br from-[#0E1139] to-[#020515]  grid place-items-center ">
                <div className="w-auto h-auto">

                    {/* Header Section */}
                    <div>
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
                        <button className="w-full bg-[#0970F0] text-white py-2 rounded-lg mt-4 font-semibold hover:scale-105 transition duration-300" onClick={handleSubmit}>Sign In</button>               
                    </div>

                </div>
            </div>
        </div>
    )
}