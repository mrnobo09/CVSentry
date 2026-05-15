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
        <PageTransition className="w-screen h-screen flex items-center justify-center p-0 md:p-6 bg-transparent">
            <SlideUp className="w-full h-full md:h-auto md:max-w-md bg-white/5 backdrop-blur-xl border-0 md:border border-white/10 rounded-none md:rounded-2xl p-8 md:p-10 flex flex-col justify-center shadow-2xl">
                <div className="text-center mb-8">
                    <img src={CVSentryLogo} className="w-16 mx-auto mb-6" alt="CVSentry Logo" />
                    <h1 className="text-2xl font-bold text-white mb-2">Two-Factor Auth</h1>
                    <p className="text-gray-400 text-sm">Enter the code sent to {email}</p>
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
        </PageTransition>
    );
}
