import loginBackground from '../assets/Images/loginBackground.jpg';
import CVSentryLogo from '../assets/Images/CVSentryLogo.png';
import { useNavigate } from "react-router-dom";
import { PageTransition, SlideUp } from "../components/AnimationWrapper";
import { MailCheck } from "lucide-react";

export default function SignupSuccess() {
    const navigate = useNavigate();

    return (
        <PageTransition className="w-screen h-screen flex items-center justify-center p-0 md:p-6 bg-transparent">
            <SlideUp className="w-full h-full md:h-auto md:max-w-md bg-white/5 backdrop-blur-xl border-0 md:border border-white/10 rounded-none md:rounded-2xl p-8 md:p-10 flex flex-col justify-center shadow-2xl text-center">
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-[#0970F0]/20 rounded-full grid place-items-center">
                        <MailCheck className="w-10 h-10 text-[#0970F0]" />
                    </div>
                </div>

                <div className="mb-8">
                    <img src={CVSentryLogo} className="w-16 mx-auto mb-6" alt="CVSentry Logo" />
                    <h1 className="text-2xl font-bold text-white mb-2">Check Your Email</h1>
                    <p className="text-gray-400 text-sm">
                        We've sent an activation link to your email address. Please click the link to activate your account.
                    </p>
                </div>

                    <button
                        className="w-full h-11 bg-[#0970F0] text-white grid place-items-center rounded-lg font-semibold hover:bg-[#0758c0] transition-colors focus:ring-4 focus:ring-[#0970f0]/30"
                        onClick={() => navigate('/login')}
                    >
                        Go to Sign In
                    </button>

                    <div className="text-center mt-6 text-white/60 text-sm">
                        Didn't receive the email? <button className="text-[#0970F0] hover:text-[#0970F0]/80 font-semibold ml-1">Resend</button>
                    </div>
            </SlideUp>
        </PageTransition>
    );
}
