import { Link, Outlet, useLocation } from 'react-router-dom';
import '../css/HomeAdmin.css';
import NavAdmin from '../navbar/NavAdmin';

const AdminLayout = ({ setRole }) => {
    const location = useLocation();
    const isActive = (path) => location.pathname === path ? "active" : "";

    return (
        <div className="admin-layout-container">
            <NavAdmin setRole={setRole} />
            
            <div className="admin-body-wrapper">
                {/* THE SIDEBAR */}
                <nav className="admin-sidebar">
                    <div className="sidebar-sticky">
                        <ul className="nav flex-column p-3">
                            <li className="nav-item mb-2">
                                <Link className={`nav-link rounded ${isActive("/pages/dashboard")}`} to="/dashboard">
                                    Dashboard Home
                                </Link>
                            </li>
                            <li className="nav-item mb-2">
                                <Link className={`nav-link rounded ${isActive("/pages/messages")}`} to="/messages">
                                    Messages
                                </Link>
                            </li>
                        </ul>
                        <div className="px-3 mt-4">
                            <Link to="/report" className="report-btn-link">Report Item</Link>
                        </div>
                    </div>
                </nav>

                {/* THE CONTENT AREA */}
                <main className="admin-main-content">
                    <Outlet /> {/* HomeAdmin will appear here */}
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;