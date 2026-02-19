import TextInput from "../components/forms/textInput";
import loginBackground from '../assets/Images/loginBackground.jpg';
import CVSentryLogo from '../assets/Images/CVSentryLogo.png';
import { useState } from "react";
import request, { setAccessToken } from "../utils/request";
import SpinnerLoader from "../components/forms/spinnerLoader";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/auth";
import { PageTransition, SlideUp } from "../components/AnimationWrapper";

export default function VerifyOTP() {
    const navigate = useNavigate();
    const location = useLocation();
    const { checkAuth } = useAuth();
    const email = location.state?.email;

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [message, setMessage] = useState<string>("");
    const [otp, setOtp] = useState<string>("");

    if (!email) {
        navigate('/login');
        return null;
    }

    const handleSubmit = async () => {
        try {
            setIsLoading(true);
            // response here is the DATA (not full axios response), because request.post returns .data
            const data = await request.post('/auth/verify-otp/', { email, otp });
            if (data.access) {
                // Store the access token in the axios instance memory
                setAccessToken(data.access);
                // Trigger auth context to re-check /me/ with the new token
                await checkAuth();
                // Navigate to dashboard - the auth context will now be true
                navigate('/dashboard');
            } else {
                setMessage("Unexpected error. Please try again.");
            }
        } catch (error: any) {
            if (error.response && error.response.data) {
                setMessage(error.response.data.detail || "Verification failed.");
            } else {
                setMessage("An error occurred.");
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
                    <div className="text-center md:text-left text-white mb-8">
                        <img src={CVSentryLogo} className="w-20 mx-auto mb-4 block md:hidden" />
                        <h1 className="text-[2rem] font-bold">Two-Factor Authentication</h1>
                        <h6 className="opacity-80">Enter the code sent to {email}</h6>
                    </div>

                    <div className="grid gap-4">
                        <div>
                            <label className="text-sm font-semibold text-white/80 mb-1 block">Verification Code</label>
                            <TextInput
                                placeholder="Enter 6-digit code..."
                                value={otp}
                                onChange={(value) => setOtp(value)}
                            />
                        </div>

                        <button
                            className="w-full h-11 bg-[#0970F0] text-white grid place-items-center rounded-lg mt-6 font-semibold hover:bg-[#0758c0] transition-colors focus:ring-4 focus:ring-[#0970f0]/30"
                            onClick={handleSubmit}
                            disabled={isLoading}
                        >
                            {isLoading ? <SpinnerLoader /> : "Verify Code"}
                        </button>

                        {message && <p className="text-red-400 text-sm font-medium mt-2 text-center">{message}</p>}

                        <div className="text-center mt-4">
                            <button onClick={() => navigate('/login')} className="text-white/60 text-sm hover:text-white">Back to Login</button>
                        </div>
                    </div>
                </SlideUp>
            </div>
        </PageTransition>
    );
}
