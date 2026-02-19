import TextInput from "../components/forms/textInput"
import loginBackground from '../assets/Images/loginBackground.jpg'
import CVSentryLogo from '../assets/Images/CVSentryLogo.png'
import { useState } from "react"
import request from "../utils/request"
import type { loginCredentials } from "../types/form"
import SpinnerLoader from "../components/forms/spinnerLoader"
import { Link, useNavigate } from "react-router-dom"
import { PageTransition, SlideUp } from "../components/AnimationWrapper"

export default function Login() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [message, setMessage] = useState<string>("")

    const [formData, setFormData] = useState<loginCredentials>({
        // @ts-ignore - Changing username to email in form, type might need update
        email: "",
        password: ""
    })

    const handleChange = (field: string, value: string) => {
        setFormData({
            ...formData,
            [field]: value
        })
    }

    const handleSubmit = async () => {
        try {
            setIsLoading(true)
            // request.post returns response.data directly (NOT the full Axios response)
            const data = await request.post('/auth/login/', formData);

            if (data.otp_required) {
                // @ts-ignore
                navigate('/verify-otp', { state: { email: formData.email } });
            } else {
                setMessage("Unexpected response. Please try again.");
            }
        } catch (error: any) {
            if (error.response && error.response.status === 401) {
                setMessage("Invalid email or password.")
            } else {
                console.error(error);
                setMessage("An error occurred. Please try again.")
            }
        } finally {
            setIsLoading(false)
        }

    }

    return (
        <PageTransition className="w-screen h-screen grid md:grid-cols-2">
            <img src={loginBackground} className="w-full h-full hidden md:block object-cover" />
            <div className="w-full h-full bg-gradient-to-br from-[#0E1139] to-[#020515]  grid place-items-center ">
                <SlideUp className="w-auto h-auto">

                    {/* Header Section */}
                    <div className="text-center md:text-left text-white">
                        <img src={CVSentryLogo} className="w-20 mx-auto mb-4 block md:hidden" />
                        <h1 className="text-[2rem] font-bold">Welcome Back!</h1>
                        <h6>Enter Your Credentials To Sign In</h6>
                    </div>

                    {/* Form Section */}
                    <div className="grid gap-4 mt-8">
                        <div>
                            <label className="text-sm font-semibold text-white">Email</label>
                            <TextInput
                                placeholder="Your email..."
                                // @ts-ignore
                                value={formData.email}
                                onChange={(value) => handleChange("email", value)}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-white">Password</label>
                            <TextInput placeholder="Your password..." type="password" value={formData.password} onChange={(value) => handleChange("password", value)} />
                        </div>
                        <button className="w-full h-10 bg-[#0970F0] text-white grid place-items-center py-2 rounded-lg mt-4 font-semibold hover:scale-105 transition duration-300" onClick={handleSubmit}>{isLoading ? <SpinnerLoader /> : "Sign In"}</button>
                        <p className="text-red-500 text-center mt-2">{message}</p>

                        <div className="text-center mt-4 text-white/60 text-sm">
                            Don't have an account? <Link to="/signup" className="text-[#0970F0] hover:text-[#0970F0]/80 font-semibold">Sign Up</Link>
                        </div>
                    </div>

                </SlideUp>
            </div>
        </PageTransition>
    )
}