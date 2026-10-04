import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/oyfoundlogoo.svg";
import "../css/NavAdmin.css";
import { auth, db } from "../firebase";

function NavAdmin() {
    const [user, setUser] = useState(null);
    const [unreadCount, setUnreadCount] = useState(0);

    // Track authentication
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });

        return () => unsubscribeAuth();
    }, []);

    // Listen to top-level messages collection where unread == true
    useEffect(() => {
        const messagesQuery = query(
            collection(db, "messages"),
            where("unread", "==", true)
        );

        const unsubscribeMessages = onSnapshot(
            messagesQuery,
            (snapshot) => {
                setUnreadCount(snapshot.size);
            },
            (error) => {
                console.error("Error fetching unread messages count:", error);
            }
        );

        return () => unsubscribeMessages();
    }, []);

    return (
        <nav className="navbar navbar-expand-lg bg-body-tertiary nav-admin-navbar">
            <div className="container-fluid nav-admin-container">

                <Link className="navbar-brand nav-admin-brand" to="/admin">
                    <img
                        src={logo}
                        alt="OyFound Logo"
                        height="44"
                        className="d-inline-block align-text-top nav-admin-logo"
                    />
                </Link>

                <button
                    className="navbar-toggler nav-admin-toggler"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#adminNavbarNav"
                    aria-controls="adminNavbarNav"
                    aria-expanded="false"
                    aria-label="Toggle navigation"
                >
                    <span className="navbar-toggler-icon"></span>
                </button>

                <div
                    className="collapse navbar-collapse"
                    id="adminNavbarNav"
                >
                    <div className="navbar-nav ms-auto align-items-center">

                        <ul className="navbar-nav mb-0 gap-3 align-items-center nav-admin-links">

                            <li className="nav-item">
                                <Link
                                    to="/dashboard"
                                    className="nav-link nav-admin-link"
                                >
                                    Dashboard
                                </Link>
                            </li>

                            <li className="nav-item">
                                <Link
                                    to="/messages"
                                    className="nav-link nav-admin-link position-relative d-inline-flex align-items-center"
                                >
                                    Messages
                                    {unreadCount > 0 && (
                                        <span className="nav-unread-badge ms-1">
                                            {unreadCount > 99 ? "99+" : unreadCount}
                                        </span>
                                    )}
                                </Link>
                            </li>

                            <li className="nav-item">
                                <Link
                                    to="/report"
                                    className="btn btn-primary btn-sm px-3 nav-admin-report-button"
                                >
                                    Report Here
                                </Link>
                            </li>

                        </ul>

                    </div>
                </div>
            </div>
        </nav>
    );
}

export default NavAdmin;
