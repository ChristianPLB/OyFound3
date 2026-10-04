import { CheckCircle2, ShieldCheck, Target, Users, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import "../css/About.css";

function About({ onClose }) {
    const navigate = useNavigate();

    const handleClose = () => {
        if (onClose) {
            onClose();
        } else {
            navigate("/");
        }
    };

    return (
        <div className="about-page">
            <div className="about-card">
                {/* Close Button */}
                <button
                    type="button"
                    className="about-close"
                    onClick={handleClose}
                    aria-label="Close"
                >
                    <X size={18} />
                </button>

                {/* Title & Introduction */}
                <h1>About Us</h1>
                <h2>What is OyFound?</h2>
                <p className="about-intro">
                    OyFound is a smart web-based lost-and-found platform designed to help students
                    and school administrators manage and recover lost items within the school campus.
                </p>
                <p className="about-description">
                    We created OyFound to make the lost-and-found process faster, more organized,
                    and easier to access. Instead of relying only on physical lost-and-found areas
                    or word-of-mouth, users can conveniently browse available item listings and
                    provide information needed to verify ownership.
                </p>

                {/* Our Purpose */}
                <div className="about-section">
                    <h3>
                        <Target size={18} style={{ marginRight: "6px", verticalAlign: "middle" }} />
                        Our Purpose
                    </h3>
                    <p className="about-section-p">
                        Losing a personal belonging can be stressful, especially in a busy school
                        environment. OyFound aims to provide a centralized platform where
                        lost-and-found information can be properly organized and managed.
                    </p>

                    <div className="about-features-block">
                        <h4>Through OyFound, students can:</h4>
                        <ul className="about-list">
                            <li>
                                <CheckCircle2 size={15} className="list-icon" />
                                Browse lost-and-found item listings
                            </li>
                            <li>
                                <CheckCircle2 size={15} className="list-icon" />
                                Search and filter items
                            </li>
                            <li>
                                <CheckCircle2 size={15} className="list-icon" />
                                View detailed information about an item
                            </li>
                            <li>
                                <CheckCircle2 size={15} className="list-icon" />
                                Submit an ownership claim
                            </li>
                            <li>
                                <CheckCircle2 size={15} className="list-icon" />
                                Provide proof or details to support their claim
                            </li>
                            <li>
                                <CheckCircle2 size={15} className="list-icon" />
                                Communicate with administrators through Anonymous Chat
                            </li>
                            <li>
                                <CheckCircle2 size={15} className="list-icon" />
                                Receive notifications and assistance through the system
                            </li>
                        </ul>
                    </div>

                    <p className="about-admin-note">
                        School administrators can manage item listings, review ownership claims,
                        verify reported items, communicate with users, and monitor lost-and-found activities.
                    </p>
                </div>

                {/* Our Goal */}
                <div className="about-section">
                    <h3>
                        <ShieldCheck size={18} style={{ marginRight: "6px", verticalAlign: "middle" }} />
                        Our Goal
                    </h3>
                    <p className="about-section-p">
                        Our goal is to create a simple, secure, and accessible lost-and-found system
                        that helps connect misplaced belongings with their rightful owners within the school community.
                    </p>
                </div>

                {/* Built for the School Community */}
                <div className="about-section community-box">
                    <h3>
                        <Users size={18} style={{ marginRight: "6px", verticalAlign: "middle" }} />
                        Built for the School Community
                    </h3>
                    <p className="about-section-p">
                        OyFound is designed for students, parents, and school administrators. By bringing
                        lost-and-found activities into one centralized platform, we hope to encourage
                        a more organized and responsible way of handling lost belongings on campus.
                    </p>
                </div>

                {/* Tagline & Close */}
                <div className="about-footer">
                    <p className="about-tagline">
                        <strong>OyFound</strong> — Helping you find what you thought was lost.
                    </p>
                    <button
                        type="button"
                        className="about-button"
                        onClick={handleClose}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

export default About;