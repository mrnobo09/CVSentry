import loginBackground from '../assets/Images/loginBackground.jpg';
import CVSentryLogo from '../assets/Images/CVSentryLogo.png';
import { useNavigate } from "react-router-dom";
import { PageTransition, SlideUp } from "../components/AnimationWrapper";
import { MailCheck } from "lucide-react";

export default function SignupSuccess() {
    const navigate = useNavigate();

    return (
        <PageTransition className="w-screen h-screen grid md:grid-cols-2">
            <img src={loginBackground} className="w-full h-full hidden md:block object-cover" />
            <div className="w-full h-full bg-gradient-to-br from-[#0E1139] to-[#020515] grid place-items-center p-4">
                <SlideUp className="w-full max-w-md text-center">
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 bg-[#0970F0]/20 rounded-full grid place-items-center">
                            <MailCheck className="w-10 h-10 text-[#0970F0]" />
                        </div>
                    </div>

                    <div className="text-white mb-8">
                        <img src={CVSentryLogo} className="w-20 mx-auto mb-4 block md:hidden" />
                        <h1 className="text-[2rem] font-bold mb-2">Check Your Email</h1>
                        <p className="opacity-80 text-lg">
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
            </div>
        </PageTransition>
    );
}
