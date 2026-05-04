import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, Monitor, Bell, LayoutDashboard, LogOut, UserCircle } from 'lucide-react';
import { useAuth } from '../contexts/auth';

interface NavbarProps {
    unreadCount: number;
}

export default function Navbar({ unreadCount }: NavbarProps) {
    const { pathname } = useLocation();
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const links = [
        { to: '/', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/nodes', label: 'Nodes', icon: Monitor },
        { to: '/alerts', label: 'Alerts', icon: Bell, badge: unreadCount },
        { to: '/faces', label: 'Faces', icon: UserCircle },
    ];

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-md border-b border-gray-800">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2.5 group">
                    <div className="w-8 h-8 bg-blue-600/20 border border-blue-500/40 rounded-lg flex items-center justify-center group-hover:border-blue-400/60 transition-colors">
                        <ShieldCheck className="w-4 h-4 text-blue-400" />
                    </div>
                    <span className="text-white font-bold text-lg tracking-tight">CVSentry</span>
                </Link>

                {/* Links */}
                <div className="flex items-center gap-1">
                    {links.map(({ to, label, icon: Icon, badge }) => {
                        const active = pathname === to || (to !== '/' && pathname.startsWith(to));
                        return (
                            <Link
                                key={to}
                                to={to}
                                className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors
                                    ${active
                                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {label}
                                {badge != null && badge > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                                        {badge > 99 ? '99+' : badge}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                    
                    <div className="w-px h-6 bg-gray-800 mx-2" />
                    
                    <button
                        onClick={handleLogout}
                        title="Log Out"
                        className="flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </nav>
    );
}
