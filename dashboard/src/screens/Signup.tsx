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
        <PageTransition className="w-screen h-screen flex items-center justify-center p-0 md:p-6 bg-transparent">
            <SlideUp className="w-full h-full md:h-auto md:max-w-md bg-white/5 backdrop-blur-xl border-0 md:border border-white/10 rounded-none md:rounded-2xl p-8 md:p-10 flex flex-col justify-center shadow-2xl">
                {/* Header Section */}
                <div className="text-center mb-8">
                    <img src={CVSentryLogo} className="w-16 mx-auto mb-6" alt="CVSentry Logo" />
                    <h1 className="text-2xl font-bold text-white mb-2">Create Account</h1>
                    <p className="text-gray-400 text-sm">Join CVSentry today</p>
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
        </PageTransition>
    );
}
