import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, doc, getDocs, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { auth, db } from '../firebase';

function Profile({ setRole }) {
    const navigate = useNavigate();

    // =========================================================
    // STATE
    // =========================================================

    const [userData, setUserData] = useState(null);
    const [userDocId, setUserDocId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [loggingOut, setLoggingOut] = useState(false);

    // =========================================================
    // REAL-TIME USER PROFILE LISTENER & ONLINE PRESENCE MANAGEMENT
    // =========================================================

    useEffect(() => {
        let unsubscribeDoc = () => {};

        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            const localStudentId = localStorage.getItem('studentId');
            const primaryId = currentUser ? currentUser.uid : localStudentId;

            if (!primaryId && !currentUser?.email) {
                setLoading(false);
                navigate('/login');
                return;
            }

            try {
                let userRef = doc(db, 'users', primaryId);

                unsubscribeDoc = onSnapshot(
                    userRef,
                    async (userDoc) => {
                        if (userDoc.exists()) {
                            setUserDocId(userDoc.id);
                            setUserData(userDoc.data());
                            setError('');
                            setLoading(false);

                            // Mark user as ONLINE in Firestore
                            if (!userDoc.data()?.isOnline) {
                                await updateDoc(userRef, { isOnline: true }).catch(() => {});
                            }
                        } else if (currentUser?.email) {
                            try {
                                const q = query(
                                    collection(db, 'users'),
                                    where('email', '==', currentUser.email)
                                );
                                const querySnap = await getDocs(q);

                                if (!querySnap.empty) {
                                    const matchedDoc = querySnap.docs[0];
                                    const matchedRef = doc(db, 'users', matchedDoc.id);
                                    setUserDocId(matchedDoc.id);

                                    unsubscribeDoc = onSnapshot(
                                        matchedRef,
                                        (subDoc) => {
                                            if (subDoc.exists()) {
                                                setUserData(subDoc.data());
                                                setError('');
                                            }
                                            setLoading(false);
                                        }
                                    );

                                    await updateDoc(matchedRef, { isOnline: true }).catch(() => {});
                                } else {
                                    setUserData({
                                        fullName: currentUser.displayName || 'User',
                                        email: currentUser.email,
                                        photoURL: currentUser.photoURL,
                                        role: localStorage.getItem('userRole') || 'user',
                                        isOnline: true
                                    });
                                    setError('');
                                    setLoading(false);
                                }
                            } catch (fallbackErr) {
                                console.error('Fallback fetch error:', fallbackErr);
                                setError('User profile details could not be found.');
                                setLoading(false);
                            }
                        } else {
                            setError('User profile details could not be found.');
                            setLoading(false);
                        }
                    },
                    (err) => {
                        console.error('Profile snapshot error:', err);
                        setError(`Failed to fetch profile: ${err.message}`);
                        setLoading(false);
                    }
                );
            } catch (err) {
                console.error('Profile listener setup error:', err);
                setError(`Initialization error: ${err.message}`);
                setLoading(false);
            }
        });

        // Set offline when user leaves the window/tab
        const handleUnload = () => {
            if (userDocId) {
                const userRef = doc(db, 'users', userDocId);
                updateDoc(userRef, { isOnline: false }).catch(() => {});
            }
        };

        window.addEventListener('beforeunload', handleUnload);

        return () => {
            window.removeEventListener('beforeunload', handleUnload);
            unsubscribeAuth();
            unsubscribeDoc();
        };
    }, [navigate, userDocId]);

    // =========================================================
    // LOGOUT (SET OFFLINE)
    // =========================================================

    const handleLogout = async () => {
        if (loggingOut) return;

        try {
            setLoggingOut(true);
            setError('');

            // Mark user offline in Firestore
            if (userDocId) {
                const userRef = doc(db, 'users', userDocId);
                await updateDoc(userRef, { isOnline: false }).catch(() => {});
            }

            // Sign out from Firebase Authentication
            await signOut(auth);

            localStorage.removeItem('userRole');
            localStorage.removeItem('studentId');

            if (setRole) {
                setRole(null);
            }

            navigate('/', { replace: true });
        } catch (err) {
            console.error('Logout error:', err);
            setError('Failed to logout. Please try again.');
            setLoggingOut(false);
        }
    };

    // =========================================================
    // LOADING & ERROR STATES
    // =========================================================

    if (loading) {
        return (
            <div className="profile-dashboard-layout d-flex align-items-center justify-content-center">
                <p style={{ color: '#E0E1DD' }}>Loading Workspace...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="profile-dashboard-layout d-flex align-items-center justify-content-center">
                <div className="dashboard-data-card" style={{ textAlign: 'center' }}>
                    <p style={{ color: '#f87171' }}>{error}</p>
                    <button
                        type="button"
                        className="btn-action-primary w-100"
                        style={{ marginTop: '16px' }}
                        onClick={() => navigate('/login')}
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    if (!userData) return null;

    // =========================================================
    // PROFILE DATA
    // =========================================================

    const formattedRole = userData.role
        ? userData.role.charAt(0).toUpperCase() + userData.role.slice(1)
        : 'User';

    const fullName =
        userData.fullName ||
        `${userData.firstName || ''} ${userData.lastName || ''}`.trim() ||
        'User';

    const initial = userData.firstName
        ? userData.firstName.charAt(0).toUpperCase()
        : 'U';

    const isOnline = userData.isOnline !== false;

    // =========================================================
    // RENDER
    // =========================================================

    return (
        <div className="profile-dashboard-layout">
            <div className="profile-grid-container">
                {/* IDENTITY SIDEBAR */}
                <aside className="hero-identity-sidebar">
                    <div className="sidebar-backdrop-glow"></div>

                    <div className="identity-card-core">
                        <div className="avatar-frame-premium">
                            {userData.photoURL ? (
                                <img
                                    src={userData.photoURL}
                                    alt={fullName}
                                    className="dashboard-avatar-img"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        const fallback = e.currentTarget.nextSibling;
                                        if (fallback) fallback.style.display = 'flex';
                                    }}
                                />
                            ) : null}

                            <div
                                className="profile-icon-fallback"
                                style={{
                                    display: userData.photoURL ? 'none' : 'flex',
                                }}
                            >
                                {initial}
                            </div>

                            {/* DYNAMIC ONLINE/OFFLINE BADGE */}
                            <div
                                className={isOnline ? "pulse-indicator-online" : "pulse-indicator-offline"}
                                title={isOnline ? "Online" : "Offline"}
                                style={{
                                    backgroundColor: isOnline ? '#059669' : '#9ca3af',
                                    boxShadow: isOnline ? '0 0 8px rgba(5, 150, 105, 0.4)' : 'none'
                                }}
                            ></div>
                        </div>

                        <div className="identity-text-stack">
                            <h2 className="user-display-name">{fullName}</h2>
                            <span className="user-role-pill">{formattedRole}</span>
                        </div>
                    </div>

                    <div className="sidebar-action-footer">
                        <Link
                            to="/edit-profile"
                            className="btn-action-primary w-100 mb-2 d-flex align-items-center justify-content-center"
                            style={{ textDecoration: 'none' }}
                        >
                            Edit Profile
                        </Link>

                        <button
                            type="button"
                            className="profile-logout-button"
                            onClick={handleLogout}
                            disabled={loggingOut}
                        >
                            {loggingOut ? 'Logging out...' : 'Logout'}
                        </button>
                    </div>
                </aside>

                {/* MAIN WORKSPACE */}
                <main className="workspace-main-content">
                    <h1 className="workspace-main-title">Account Workspace</h1>

                    <div className="dashboard-cards-grid">
                        <div className="dashboard-data-card">
                            <div className="card-indicator-line"></div>
                            <h3 className="data-card-title">Personal Details</h3>
                            <div className="meta-data-block">
                                <label>Full Name</label>
                                <p>{fullName}</p>
                            </div>
                            <div className="meta-data-block">
                                <label>Gender</label>
                                <p style={{ textTransform: 'capitalize' }}>{userData.gender || 'N/A'}</p>
                            </div>
                            <div className="meta-data-block">
                                <label>Date of Birth</label>
                                <p>{userData.birthdate || 'N/A'}</p>
                            </div>
                        </div>

                        <div className="dashboard-data-card">
                            <div className="card-indicator-line variant-accent"></div>
                            <h3 className="data-card-title">Contact & Security</h3>
                            {userData.email ? (
                                <div className="meta-data-block">
                                    <label>Email Address</label>
                                    <p>{userData.email}</p>
                                </div>
                            ) : (
                                <div className="meta-data-block">
                                    <label>Account Type</label>
                                    <p>Elementary Student (No Email)</p>
                                </div>
                            )}
                            {userData.phone && (
                                <div className="meta-data-block">
                                    <label>Phone Number</label>
                                    <p>{userData.phone}</p>
                                </div>
                            )}
                            <div className="meta-data-block">
                                <label>Role Type</label>
                                <p>{formattedRole}</p>
                            </div>
                        </div>

                        {userData.role === 'student' && (
                            <div className="dashboard-data-card" style={{ gridColumn: '1 / -1' }}>
                                <div className="card-indicator-line"></div>
                                <h3 className="data-card-title">Academic Profile</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                                    {userData.studentId && (
                                        <div className="meta-data-block">
                                            <label>Student ID</label>
                                            <p>{userData.studentId}</p>
                                        </div>
                                    )}
                                    <div className="meta-data-block">
                                        <label>Department</label>
                                        <p>{userData.department || 'N/A'}</p>
                                    </div>
                                    {userData.department === 'College' && (
                                        <>
                                            <div className="meta-data-block">
                                                <label>Program / Major</label>
                                                <p>{userData.collegeDept || 'N/A'}</p>
                                            </div>
                                            <div className="meta-data-block">
                                                <label>Year Level</label>
                                                <p>Year {userData.yearLevel || 'N/A'}</p>
                                            </div>
                                            <div className="meta-data-block">
                                                <label>Block</label>
                                                <p>Block {userData.block || 'N/A'}</p>
                                            </div>
                                        </>
                                    )}
                                    {userData.department === 'Senior High' && (
                                        <div className="meta-data-block">
                                            <label>Strand / Track</label>
                                            <p>{userData.shsCourse || 'N/A'}</p>
                                        </div>
                                    )}
                                    {userData.department === 'Junior High' && (
                                        <div className="meta-data-block">
                                            <label>Grade Level</label>
                                            <p>Grade {userData.jhsGradeLevel || 'N/A'}</p>
                                        </div>
                                    )}
                                    {userData.department === 'Elementary' && (
                                        <div className="meta-data-block">
                                            <label>Grade Level</label>
                                            <p>{userData.elementaryGradeLevel ? `Grade ${userData.elementaryGradeLevel}` : 'N/A'}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}

export default Profile;