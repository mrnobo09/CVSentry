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
                if (error.response.data && error.response.data.inactive) {
                    setMessage("Account inactive. A new activation email has been sent.");
                } else {
                    setMessage("Invalid email or password.");
                }
            } else {
                console.error(error);
                setMessage("An error occurred. Please try again.");
            }
        } finally {
            setIsLoading(false)
        }

    }

    return (
        <PageTransition className="w-screen h-screen flex items-center justify-center p-0 md:p-6 bg-transparent">
            <SlideUp className="w-full h-full md:h-auto md:max-w-md bg-white/5 backdrop-blur-xl border-0 md:border border-white/10 rounded-none md:rounded-2xl p-8 md:p-10 flex flex-col justify-center shadow-2xl">
                {/* Header Section */}
                <div className="text-center mb-8">
                    <img src={CVSentryLogo} className="w-16 mx-auto mb-6" alt="CVSentry Logo" />
                    <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
                    <p className="text-gray-400 text-sm">Enter your credentials to sign in</p>
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
        </PageTransition>
    )
}