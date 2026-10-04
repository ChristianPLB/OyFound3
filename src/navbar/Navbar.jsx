import { Link } from "react-router-dom";

import logoSvg from "../assets/oyfoundlogoo.svg"; // Adjust path if logo is placed elsewhere (e.g., ../assets/ or public/)
import "../css/Navbar.css";

function Navbar({ onContact, onAbout }) {
    return (
        <nav className="oyfound-navbar">
            <div className="oyfound-navbar-container">

                {/* LOGO (Left Corner) */}
                <Link to="/" className="oyfound-navbar-logo">
                    <img 
                        src={logoSvg} 
                        alt="OyFound Logo" 
                        className="oyfound-logo-img" 
                    />
                </Link>

                {/* NAVIGATION */}
                <div className="oyfound-navbar-links">

                    <button
                        type="button"
                        className="oyfound-nav-link nav-button"
                        onClick={onContact}
                    >
                        Contact Us
                    </button>

                    <button
                        type="button"
                        className="oyfound-nav-link nav-button"
                        onClick={onAbout}
                    >
                        About Us
                    </button>

                </div>
            </div>
        </nav>
    );
}

export default Navbar;