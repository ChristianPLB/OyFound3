import React from "react";
import { useNavigate } from "react-router-dom";

import "../css/Home.css";

function Home() {
    const navigate = useNavigate();

    const goToLogin = () => {
        navigate("/login");
    };

    return (
        <main className="home-page">

            {/* BACKGROUND */}
            <div className="hero-background"></div>


            {/* DECORATIVE 3D FLOATING ITEMS */}

            {/* 3D SMARTPHONE */}
            <div className="lost-item phone-item">
                <div className="phone-3d">
                    <div className="phone-body-3d">
                        <div className="phone-camera-bump">
                            <div className="lens"></div>
                            <div className="lens"></div>
                        </div>
                        <div className="phone-screen-3d">
                            <div className="phone-notch"></div>
                            <div className="phone-glare"></div>
                        </div>
                    </div>
                </div>
            </div>


            {/* 3D TUMBLER (INSULATED WATER BOTTLE) */}
            <div className="lost-item tumbler-item">
                <div className="tumbler-3d">
                    <div className="tumbler-handle"></div>
                    <div className="tumbler-lid">
                        <div className="tumbler-spout"></div>
                    </div>
                    <div className="tumbler-rim"></div>
                    <div className="tumbler-body">
                        <div className="tumbler-grip-ring"></div>
                        <div className="tumbler-sheen"></div>
                    </div>
                </div>
            </div>


            {/* 3D LEATHER WALLET */}
            <div className="lost-item wallet-item">
                <div className="wallet-3d">
                    <div className="wallet-body-3d">
                        <div className="wallet-card-slot">
                            <div className="credit-card"></div>
                        </div>
                        <div className="wallet-clasp">
                            <div className="clasp-button"></div>
                        </div>
                    </div>
                </div>
            </div>


            {/* 3D BALLPOINT PEN */}
            <div className="lost-item pen-item">
                <div className="pen-3d">
                    <div className="pen-clip"></div>
                    <div className="pen-cap-ring"></div>
                    <div className="pen-barrel">
                        <div className="pen-grip"></div>
                    </div>
                    <div className="pen-tip"></div>
                </div>
            </div>


            {/* 3D BACKPACK */}
            <div className="lost-item bag-item">
                <div className="backpack-3d">
                    <div className="bag-top-handle"></div>
                    <div className="bag-strap strap-left"></div>
                    <div className="bag-strap strap-right"></div>
                    <div className="bag-main-body">
                        <div className="bag-top-zip"></div>
                        <div className="bag-front-pocket">
                            <div className="pocket-zip"></div>
                            <div className="bag-logo"></div>
                        </div>
                    </div>
                </div>
            </div>


            {/* MAIN CONTENT */}

            <section className="hero-content">

                <h1>
                    WELCOME TO
                    <span>OYFOUND!</span>
                </h1>

                <p className="hero-description">
                    A Smart Web-Based Platform for Reporting
                    and Recovering Lost Items
                </p>

                <p className="hero-tagline">
                    “Helping You Find Lost Items and Bring Them Back Home.”
                </p>

                <button
                    type="button"
                    className="get-started-button"
                    onClick={goToLogin}
                >
                    Get Started
                </button>

            </section>


            {/* FOOTER */}
            <footer className="home-footer">
                <p className="text-start">2026 @Copyright Oyfound rights</p>
            </footer>

        </main>
    );
}

export default Home;