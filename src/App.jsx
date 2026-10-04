import { signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";

import "./App.css";
import { auth } from "./firebase";

// Public pages
import ForgotPassword from "./components/ForgotPassword.jsx";
import Home from "./components/Home.jsx";
import Login from "./components/Login.jsx";
import Register from "./components/Register.jsx";

// Navigation
import NavAdmin from "./navbar/NavAdmin.jsx";
import Navbar from "./navbar/Navbar.jsx";
import NavStudent from "./navbar/NavStudent.jsx";

// Pages
import About from "./pages/About.jsx";
import Contact from "./pages/Contact.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import EditProfile from "./pages/EditProfile.jsx";
import HomeAdmin from "./pages/HomeAdmin.jsx";
import HomeStudent from "./pages/HomeStudent.jsx";
import Messages from "./pages/Messages.jsx";
import Profile from "./pages/Profile.jsx";
import ReportItem from "./pages/ReportItem.jsx";
import SMessages from "./pages/SMessages.jsx";
import StudentDashboard from "./pages/StudentDashboard.jsx";

// CSS
import "./css/About.css";
import "./css/AISupportPage.css";
import "./css/Contact.css";
import "./css/Dashboard.css";
import "./css/Footer.css";
import "./css/HomeAdmin.css";
import "./css/HomeStudent.css";
import "./css/Login.css";
import "./css/Messages.css";
import "./css/Navbar.css";
import "./css/NavStudent.css";
import "./css/Profile.css";
import "./css/Register.css";
import "./css/Report.css";
import "./css/SMessages.css";

function App() {
    const [role, setRole] = useState(
        () => localStorage.getItem("userRole") || null
    );

    const [searchQuery, setSearchQuery] = useState("");

    const [showContact, setShowContact] = useState(false);
    const [showAbout, setShowAbout] = useState(false);

    // Development reset
    useEffect(() => {
        const resetAuth = async () => {
            try {
                await signOut(auth);
                localStorage.removeItem("userRole");
                setRole(null);
            } catch (error) {
                console.error("Error signing out:", error);
            }
        };

        resetAuth();
    }, []);

    return (
        <>
            {/* PUBLIC NAVBAR */}
            {!role && (
                <Navbar
                    onContact={() => setShowContact(true)}
                    onAbout={() => setShowAbout(true)}
                />
            )}

            {/* ADMIN NAVBAR */}
            {role === "admin" && (
                <NavAdmin
                    setRole={setRole}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                />
            )}

            {/* STUDENT NAVBAR */}
            {(role === "student" || role === "guest") && (
                <NavStudent
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                />
            )}

            {/* ROUTES */}
            <Routes>
                {/* Public */}
                <Route path="/" element={<Home />} />

                <Route
                    path="/login"
                    element={<Login setRole={setRole} />}
                />

                <Route
                    path="/register"
                    element={<Register setRole={setRole} />}
                />

                <Route
                    path="/forgot-password"
                    element={<ForgotPassword />}
                />

                <Route
                    path="/contact"
                    element={<Contact />}
                />

                <Route
                    path="/about"
                    element={<About />}
                />

                {/* Admin */}
                {role === "admin" && (
                    <>
                        <Route
                            path="/admin"
                            element={
                                <HomeAdmin
                                    searchQuery={searchQuery}
                                />
                            }
                        />

                        <Route
                            path="/messages"
                            element={<Messages />}
                        />

                        <Route
                            path="/dashboard"
                            element={<Dashboard />}
                        />

                        <Route
                            path="/report"
                            element={<ReportItem />}
                        />
                    </>
                )}

                {/* Student / Guest */}
                {(role === "student" || role === "guest") && (
                    <>
                        <Route
                            path="/student"
                            element={
                                <HomeStudent
                                    searchQuery={searchQuery}
                                />
                            }
                        />

                        <Route
                            path="/studentdashboard"
                            element={<StudentDashboard />}
                        />

                        <Route
                            path="/studentmessages"
                            element={<SMessages />}
                        />
                    </>
                )}

                {/* Shared authenticated pages */}
                {role && (
                    <>
                        <Route
                            path="/profile"
                            element={<Profile setRole={setRole} />}
                        />

                        <Route
                            path="/edit-profile"
                            element={<EditProfile setRole={setRole} />}
                        />
                    </>
                )}

                {/* Fallback */}
                <Route path="*" element={<Home />} />
            </Routes>

            {/* CONTACT POPUP */}
            {showContact && (
                <div
                    className="popup-overlay"
                    onClick={() => setShowContact(false)}
                >
                    <div onClick={(event) => event.stopPropagation()}>
                        <Contact onClose={() => setShowContact(false)} />
                    </div>
                </div>
            )}

            {/* ABOUT POPUP */}
            {showAbout && (
                <div
                    className="popup-overlay"
                    onClick={() => setShowAbout(false)}
                >
                    <div onClick={(event) => event.stopPropagation()}>
                        <About onClose={() => setShowAbout(false)} />
                    </div>
                </div>
            )}
        </>
    );
}

export default App;