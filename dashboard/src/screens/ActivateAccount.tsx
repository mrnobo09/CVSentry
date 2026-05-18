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
        <PageTransition className="w-screen h-screen flex items-center justify-center p-0 md:p-6 bg-transparent">
            <SlideUp className="w-full h-full md:h-auto md:max-w-md bg-white/5 backdrop-blur-xl border-0 md:border border-white/10 rounded-none md:rounded-2xl p-8 md:p-10 flex flex-col justify-center shadow-2xl text-center">
                <div className="flex justify-center mb-6">
                    {status === 'loading' && <div className="w-20 h-20 bg-[#0970F0]/20 rounded-full grid place-items-center"><SpinnerLoader /></div>}
                    {status === 'success' && <div className="w-20 h-20 bg-emerald-500/20 rounded-full grid place-items-center"><CheckCircle className="w-10 h-10 text-emerald-400" /></div>}
                    {status === 'error' && <div className="w-20 h-20 bg-red-500/20 rounded-full grid place-items-center"><XCircle className="w-10 h-10 text-red-400" /></div>}
                </div>

                <div className="mb-8">
                    <img src={CVSentryLogo} className="w-16 mx-auto mb-6" alt="CVSentry Logo" />
                    <h1 className="text-2xl font-bold text-white mb-2">Account Activation</h1>

                    {status === 'loading' && (
                        <p className="text-gray-400 text-sm">Please wait while we activate your account...</p>
                    )}
                    {status === 'success' && (
                        <p className="text-gray-400 text-sm">Account activated successfully! Redirecting to login...</p>
                    )}
                    {status === 'error' && resendStatus !== 'success' && (
                        <p className="text-gray-400 text-sm mb-4">Failed to activate account. The link may be invalid or expired. Enter your email to resend.</p>
                    )}
                    {resendStatus === 'success' && (
                        <p className="text-emerald-400 text-sm font-semibold">A new activation link has been sent to your email!</p>
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
        </PageTransition>
    );
}
