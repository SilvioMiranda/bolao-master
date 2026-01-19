import { Outlet, Link, useLocation } from 'react-router-dom';
import './Layout.css';

export default function Layout() {
    const location = useLocation();

    const isActive = (path: string) => {
        return location.pathname === path || location.pathname.startsWith(path + '/');
    };

    return (
        <div className="layout">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h2 className="sidebar-title">🎰 Bolão</h2>
                    <p className="sidebar-subtitle">Gerenciamento de Loterias</p>
                </div>

                <nav className="sidebar-nav">
                    <Link
                        to="/"
                        className={`nav-link ${isActive('/') && location.pathname === '/' ? 'active' : ''}`}
                    >
                        <span className="nav-icon">📊</span>
                        <span>Dashboard</span>
                    </Link>

                    <Link
                        to="/participants"
                        className={`nav-link ${isActive('/participants') ? 'active' : ''}`}
                    >
                        <span className="nav-icon">👥</span>
                        <span>Participantes</span>
                    </Link>

                    <Link
                        to="/groups"
                        className={`nav-link ${isActive('/groups') ? 'active' : ''}`}
                    >
                        <span className="nav-icon">🎲</span>
                        <span>Grupos</span>
                    </Link>
                </nav>
            </aside>

            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}
