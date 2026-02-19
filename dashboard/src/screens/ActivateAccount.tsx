import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import request from "../utils/request";
import { PageTransition, SlideUp } from "../components/AnimationWrapper";
import loginBackground from '../assets/Images/loginBackground.jpg';
import CVSentryLogo from '../assets/Images/CVSentryLogo.png';
import SpinnerLoader from "../components/forms/spinnerLoader";
import { CheckCircle, XCircle } from "lucide-react";

export default function ActivateAccount() {
    const { uid, token } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

    const handleActivation = async () => {
        try {
            await request.post('/auth/users/activation/', { uid, token });
            setStatus('success');
            setTimeout(() => navigate('/login'), 3000);
        } catch (error) {
            console.error(error);
            setStatus('error');
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
                        {status === 'error' && (
                            <p className="opacity-80 text-lg">Failed to activate account. The link may be invalid or expired.</p>
                        )}
                    </div>

                    {status === 'loading' && (
                        <button
                            className="w-full h-11 bg-[#0970F0] text-white grid place-items-center rounded-lg font-semibold hover:bg-[#0758c0] transition-colors focus:ring-4 focus:ring-[#0970f0]/30"
                            onClick={handleActivation}
                        >
                            Activate Account
                        </button>
                    )}

                    {status === 'error' && (
                        <button
                            className="w-full h-11 bg-[#0970F0] text-white grid place-items-center rounded-lg font-semibold hover:bg-[#0758c0] transition-colors focus:ring-4 focus:ring-[#0970f0]/30"
                            onClick={() => navigate('/login')}
                        >
                            Go to Login
                        </button>
                    )}
                </SlideUp>
            </div>
        </PageTransition>
    );
}
