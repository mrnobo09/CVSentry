import TextInput from "../components/forms/textInput";
import loginBackground from '../assets/Images/loginBackground.jpg';
import CVSentryLogo from '../assets/Images/CVSentryLogo.png';
import { useState } from "react";
import request from "../utils/request";
import SpinnerLoader from "../components/forms/spinnerLoader";
import { Link, useNavigate } from "react-router-dom";
import { PageTransition, SlideUp } from "../components/AnimationWrapper";

export default function Signup() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [message, setMessage] = useState<string>("");
    const [formData, setFormData] = useState({
        email: "",
        fullname: "",
        password: "",
        re_password: ""
    });

    const handleChange = (field: string, value: string) => {
        setFormData({
            ...formData,
            [field]: value
        });
    };

    const handleSubmit = async () => {
        setMessage("");
        if (formData.password !== formData.re_password) {
            setMessage("Passwords do not match.");
            return;
        }

        try {
            setIsLoading(true);
            await request.post('/auth/users/', formData);
            // Success
            navigate('/signup-success');
        } catch (error: any) {
            console.error(error);
            if (error.response && error.response.data) {
                const errors = Object.values(error.response.data).flat();
                setMessage(errors[0] as string || "An error occurred.");
            } else {
                setMessage("An error occurred. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <PageTransition className="w-screen h-screen grid md:grid-cols-2">
            <img src={loginBackground} className="w-full h-full hidden md:block object-cover" />
            <div className="w-full h-full bg-gradient-to-br from-[#0E1139] to-[#020515] grid place-items-center p-4">
                <SlideUp className="w-full max-w-md">
                    {/* Header Section */}
                    <div className="text-center md:text-left text-white mb-8">
                        <img src={CVSentryLogo} className="w-20 mx-auto mb-4 block md:hidden" />
                        <h1 className="text-[2rem] font-bold">Create Account</h1>
                        <h6 className="opacity-80">Join CVSentry today</h6>
                    </div>

                    {/* Form Section */}
                    <div className="grid gap-4">
                        <div>
                            <label className="text-sm font-semibold text-white/80 mb-1 block">Full Name</label>
                            <TextInput placeholder="Your full name..." value={formData.fullname} onChange={(value) => handleChange("fullname", value)} />
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-white/80 mb-1 block">Email</label>
                            <TextInput placeholder="Your email..." value={formData.email} onChange={(value) => handleChange("email", value)} />
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-white/80 mb-1 block">Password</label>
                            <TextInput placeholder="Create password..." type="password" value={formData.password} onChange={(value) => handleChange("password", value)} />
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-white/80 mb-1 block">Confirm Password</label>
                            <TextInput placeholder="Repeat password..." type="password" value={formData.re_password} onChange={(value) => handleChange("re_password", value)} />
                        </div>

                        <button
                            className="w-full h-11 bg-[#0970F0] text-white grid place-items-center rounded-lg mt-6 font-semibold hover:bg-[#0758c0] transition-colors focus:ring-4 focus:ring-[#0970f0]/30"
                            onClick={handleSubmit}
                            disabled={isLoading}
                        >
                            {isLoading ? <SpinnerLoader /> : "Sign Up"}
                        </button>

                        {message && <p className="text-red-400 text-sm font-medium mt-2 text-center">{message}</p>}

                        <div className="text-center mt-6 text-white/60 text-sm">
                            Already have an account? <Link to="/login" className="text-[#0970F0] hover:text-[#0970F0]/80 font-semibold">Sign In</Link>
                        </div>
                    </div>
                </SlideUp>
            </div>
        </PageTransition>
    );
}
