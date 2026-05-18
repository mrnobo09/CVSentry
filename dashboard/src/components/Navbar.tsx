import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, Monitor, Bell, LayoutDashboard, LogOut, UserCircle, Film } from 'lucide-react';
import { useAuth } from '../contexts/auth';

interface NavbarProps {
    unreadCount: number;
}

import CVSentryLogo from '../assets/Images/CVSentryLogo.png';

export default function Navbar({ unreadCount }: NavbarProps) {
    const { pathname } = useLocation();
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const links = [
        { to: '/', label: 'Home', icon: LayoutDashboard },
        { to: '/nodes', label: 'Nodes', icon: Monitor },
        { to: '/alerts', label: 'Alerts', icon: Bell, badge: unreadCount },
        { to: '/recordings', label: 'Clips', icon: Film },
        { to: '/faces', label: 'Faces', icon: UserCircle },
    ];

    return (
        <nav className="fixed bottom-4 left-4 right-4 sm:top-4 sm:bottom-auto sm:left-6 sm:right-6 z-50 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-lg transition-all duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between sm:justify-between justify-center gap-4">
                {/* Logo - Hidden on mobile, shown on desktop */}
                <Link to="/" className="hidden sm:flex items-center gap-2.5 group shrink-0">
                    <img src={CVSentryLogo} alt="CVSentry Logo" className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(59,130,246,0.5)] group-hover:scale-110 transition-transform duration-300" />
                    <span className="text-white font-bold text-lg tracking-tight drop-shadow-md">CVSentry</span>
                </Link>

                {/* Links */}
                <div className="flex items-center justify-around sm:justify-end flex-1 sm:flex-none gap-1 sm:gap-2">
                    {links.map(({ to, label, icon: Icon, badge }) => {
                        const active = pathname === to || (to !== '/' && pathname.startsWith(to));
                        return (
                            <Link
                                key={to}
                                to={to}
                                className={`relative flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 p-2 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 flex-1 sm:flex-none
                                    ${active
                                        ? 'bg-blue-500/20 text-blue-400 border border-blue-400/30 shadow-[0_0_15px_rgba(59,130,246,0.15)] scale-105 sm:scale-100'
                                        : 'text-gray-400 hover:text-blue-300 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/30 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                                    }`}
                            >
                                <Icon className="w-5 h-5 sm:w-4 sm:h-4" />
                                <span className="text-[10px] sm:text-sm leading-none">{label}</span>
                                {badge != null && badge > 0 && (
                                    <span className="absolute -top-1 sm:-top-1.5 right-1 sm:-right-1.5 min-w-[16px] h-[16px] sm:min-w-[18px] sm:h-[18px] bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] text-white text-[9px] sm:text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                                        {badge > 99 ? '99+' : badge}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                    
                    <div className="w-px h-6 bg-white/10 mx-1 sm:mx-2 hidden sm:block" />
                    
                    <button
                        onClick={handleLogout}
                        title="Log Out"
                        className="flex flex-col sm:flex-row items-center justify-center p-2 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/20 hover:border hover:border-red-500/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)] transition-all duration-300 ml-1 shrink-0"
                    >
                        <LogOut className="w-5 h-5 sm:w-4 sm:h-4" />
                        <span className="text-[10px] sm:hidden leading-none mt-1">Logout</span>
                    </button>
                </div>
            </div>
        </nav>
    );
}
