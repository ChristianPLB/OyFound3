import { Building2, Clock, HelpCircle, Mail, MessageSquare, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import "../css/Contact.css";

function Contact({ onClose }) {
    const navigate = useNavigate();

    const handleClose = () => {
        if (onClose) {
            onClose();
        } else {
            navigate("/");
        }
    };

    return (
        <div className="contact-page">
            <div className="contact-card">
                {/* Close Button */}
                <button
                    type="button"
                    className="contact-close"
                    onClick={handleClose}
                    aria-label="Close"
                >
                    <X size={18} />
                </button>

                {/* Header */}
                <h1>Contact Us</h1>
                <h2>We're Here to Help</h2>
                <p className="contact-intro">
                    Have a question about a lost item, ownership claim, or your OyFound account?
                    Our school administrators are here to assist you.
                </p>

                {/* Get in Touch Section */}
                <div className="contact-section">
                    <h3>Get in Touch</h3>

                    <div className="contact-item">
                        <div className="contact-icon">
                            <Mail size={19} />
                        </div>
                        <div>
                            <h4>Email</h4>
                            <p>
                                <a href="mailto:support@oyfound.com">support@oyfound.com</a>
                            </p>
                        </div>
                    </div>

                    <div className="contact-item">
                        <div className="contact-icon">
                            <Building2 size={19} />
                        </div>
                        <div>
                            <h4>Location</h4>
                            <p>
                                Consolatrix College of Toledo City<br />
                                Magsaysay Hills, Poblacion, Toledo City, Cebu, Philippines
                            </p>
                        </div>
                    </div>

                    <div className="contact-item">
                        <div className="contact-icon">
                            <Clock size={19} />
                        </div>
                        <div>
                            <h4>Office Hours</h4>
                            <p>
                                Monday – Friday<br />
                                8:00 AM – 4:00 PM
                            </p>
                        </div>
                    </div>
                </div>

                {/* Need Help With Section */}
                <div className="contact-section">
                    <h3>
                        <HelpCircle size={18} style={{ marginRight: "6px", verticalAlign: "middle" }} />
                        Need Help With?
                    </h3>
                    <ul className="contact-help-list">
                        <li>Reporting or viewing lost-and-found items</li>
                        <li>Submitting an ownership claim</li>
                        <li>Providing proof of ownership</li>
                        <li>Claim status and verification</li>
                        <li>Account-related concerns</li>
                        <li>General questions about OyFound</li>
                    </ul>
                </div>

                {/* Anonymous Chat Note */}
                <div className="contact-section anonymous-chat-box">
                    <h3>
                        <MessageSquare size={18} style={{ marginRight: "6px", verticalAlign: "middle" }} />
                        Anonymous Chat
                    </h3>
                    <p>
                        For concerns regarding a specific lost or found item, you can also use{" "}
                        <strong>Anonymous Chat</strong> within OyFound to communicate directly with
                        a school administrator while keeping your personal information private.
                    </p>
                </div>

                <p className="contact-note">
                    Please provide accurate details about your concern so our administrators can assist you properly.
                </p>

                {/* Footer Tagline & Button */}
                <div className="contact-footer">
                    <p className="contact-tagline">
                        <strong>OyFound</strong> — Helping you find what you thought was lost.
                    </p>
                    <button
                        type="button"
                        className="contact-button"
                        onClick={handleClose}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Contact;