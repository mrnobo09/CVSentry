import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import request from "../utils/request";
import { PageTransition, SlideUp } from "../components/AnimationWrapper";
import loginBackground from '../assets/Images/loginBackground.jpg';
import CVSentryLogo from '../assets/Images/CVSentryLogo.png';
import SpinnerLoader from "../components/forms/spinnerLoader";
import { CheckCircle, XCircle } from "lucide-react";
import TextInput from "../components/forms/textInput";

export default function ActivateAccount() {
    const { uid, token } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [email, setEmail] = useState("");
    const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'success'>('idle');

    useEffect(() => {
        let isMounted = true;
        const activate = async () => {
            try {
                // Use raw axios to prevent auth interceptors from attaching invalid headers
                await axios.post(import.meta.env.VITE_BACKEND_URL + '/auth/users/activation/', { uid, token });
                if (isMounted) {
                    setStatus('success');
                    setTimeout(() => navigate('/login'), 3500);
                }
            } catch (error) {
                console.error(error);
                if (isMounted) setStatus('error');
            }
        };
        activate();
        return () => { isMounted = false; };
    }, [uid, token, navigate]);

    const handleResend = async () => {
        if (!email) return;
        try {
            setResendStatus('loading');
            await request.post('/auth/users/resend_activation/', { email });
            setResendStatus('success');
        } catch (error) {
            console.error(error);
            setResendStatus('idle');
        }
    };

    return (
        <PageTransition className="w-screen h-screen grid md:grid-cols-2">
            <img src={loginBackground} className="w-full h-full hidden md:block object-cover" />
            <div className="w-full h-full bg-gradient-to-br from-[#0E1139] to-[#020515] grid place-items-center p-4">
                <SlideUp className="w-full max-w-md text-center">
                    <div className="flex justify-center mb-6">
                        {status === 'loading' && <div className="w-20 h-20 bg-[#0970F0]/20 rounded-full grid place-items-center"><SpinnerLoader /></div>}
                        {status === 'success' && <div className="w-20 h-20 bg-green-500/20 rounded-full grid place-items-center"><CheckCircle className="w-10 h-10 text-green-500" /></div>}
                        {status === 'error' && <div className="w-20 h-20 bg-red-500/20 rounded-full grid place-items-center"><XCircle className="w-10 h-10 text-red-500" /></div>}
                    </div>

                    <div className="text-white mb-8">
                        <img src={CVSentryLogo} className="w-20 mx-auto mb-4 block md:hidden" />
                        <h1 className="text-[2rem] font-bold mb-2">Account Activation</h1>

                        {status === 'loading' && (
                            <p className="opacity-80 text-lg">Please wait while we activate your account...</p>
                        )}
                        {status === 'success' && (
                            <p className="opacity-80 text-lg">Account activated successfully! Redirecting to login...</p>
                        )}
                        {status === 'error' && resendStatus !== 'success' && (
                            <p className="opacity-80 text-lg mb-4">Failed to activate account. The link may be invalid or expired. Enter your email to resend.</p>
                        )}
                        {resendStatus === 'success' && (
                            <p className="text-green-400 text-lg">A new activation link has been sent to your email!</p>
                        )}
                    </div>

                    {status === 'error' && resendStatus !== 'success' && (
                        <div className="grid gap-4 mt-4 text-left">
                            <TextInput 
                                placeholder="Enter your email" 
                                value={email} 
                                onChange={(value) => setEmail(value)} 
                            />
                            <button
                                className="w-full h-11 bg-[#0970F0] text-white grid place-items-center rounded-lg font-semibold hover:bg-[#0758c0] transition-colors focus:ring-4 focus:ring-[#0970f0]/30"
                                onClick={handleResend}
                                disabled={resendStatus === 'loading'}
                            >
                                {resendStatus === 'loading' ? <SpinnerLoader /> : "Resend Activation Link"}
                            </button>
                            <button
                                className="w-full h-11 bg-transparent border border-[#0970F0] text-[#0970F0] grid place-items-center rounded-lg font-semibold hover:bg-[#0970F0]/10 transition-colors"
                                onClick={() => navigate('/login')}
                            >
                                Go to Login
                            </button>
                        </div>
                    )}
                </SlideUp>
            </div>
        </PageTransition>
    );
}
