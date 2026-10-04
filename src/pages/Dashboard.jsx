import {
    collection,
    collectionGroup,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    query,
    serverTimestamp,
    where,
    writeBatch
} from "firebase/firestore";

import {
    onAuthStateChanged,
    signOut
} from "firebase/auth";

import { useEffect, useState } from "react";

import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";

import { useNavigate } from "react-router-dom";

import { auth, db } from "../firebase";

function Dashboard({ setRole }) {

    const navigate = useNavigate();

    // =========================================================
    // STATE
    // =========================================================

    const [activeTab, setActiveTab] = useState("Lost");
    const [searchTerm, setSearchTerm] = useState("");

    const [reports, setReports] = useState([]);
    const [claimedReports, setClaimedReports] = useState([]);
    const [users, setUsers] = useState([]);

    const [currentUser, setCurrentUser] = useState(null);

    const [isAdmin, setIsAdmin] = useState(false);
    const [checkingAdmin, setCheckingAdmin] = useState(true);

    const [processingItemId, setProcessingItemId] = useState(null);
    const [processingUserId, setProcessingUserId] = useState(null);


    // =========================================================
    // DEFAULT PROFILE ICON
    // =========================================================

    const DEFAULT_ICON =
        "https://cdn-icons-png.flaticon.com/512/149/149071.png";


    // =========================================================
    // FORMAT FIRESTORE TIMESTAMP
    // =========================================================

    const getTimestampValue = (timestamp) => {

        if (!timestamp) {
            return 0;
        }

        if (
            typeof timestamp.toMillis === "function"
        ) {
            return timestamp.toMillis();
        }

        if (
            typeof timestamp.toDate === "function"
        ) {
            return timestamp.toDate().getTime();
        }

        if (timestamp instanceof Date) {
            return timestamp.getTime();
        }

        const parsed = new Date(timestamp);

        if (!Number.isNaN(parsed.getTime())) {
            return parsed.getTime();
        }

        return 0;
    };


    const formatTimestamp = (timestamp) => {

        if (!timestamp) {
            return "No date";
        }

        try {

            if (
                typeof timestamp.toDate === "function"
            ) {
                return timestamp
                    .toDate()
                    .toLocaleString();
            }

            if (timestamp instanceof Date) {
                return timestamp.toLocaleString();
            }

            const parsed = new Date(timestamp);

            if (!Number.isNaN(parsed.getTime())) {
                return parsed.toLocaleString();
            }

        } catch (error) {
            console.error(
                "Timestamp formatting error:",
                error
            );
        }

        return "No date";
    };


    // =========================================================
    // CHECK CURRENT USER / ADMIN ROLE
    // =========================================================

    useEffect(() => {

        const unsubscribe = onAuthStateChanged(
            auth,
            async (user) => {

                setCurrentUser(user);
                setCheckingAdmin(true);

                if (!user) {

                    setIsAdmin(false);
                    setCheckingAdmin(false);

                    return;
                }

                try {

                    let admin = false;

                    const userRef = doc(
                        db,
                        "users",
                        user.uid
                    );

                    const userSnap =
                        await getDoc(userRef);

                    if (userSnap.exists()) {

                        const userData =
                            userSnap.data();

                        if (
                            String(
                                userData.role || ""
                            ).toLowerCase() ===
                            "admin"
                        ) {
                            admin = true;
                        }
                    }

                    if (!admin && user.email) {

                        const emailQuery =
                            query(
                                collection(
                                    db,
                                    "users"
                                ),
                                where(
                                    "email",
                                    "==",
                                    user.email
                                )
                            );

                        const emailSnap =
                            await getDocs(
                                emailQuery
                            );

                        admin =
                            emailSnap.docs.some(
                                (userDoc) => {

                                    const data =
                                        userDoc.data();

                                    return (
                                        String(
                                            data.role ||
                                                ""
                                        ).toLowerCase() ===
                                        "admin"
                                    );
                                }
                            );
                    }

                    setIsAdmin(admin);

                } catch (error) {

                    console.error(
                        "Error checking administrator role:",
                        error
                    );

                    setIsAdmin(false);

                } finally {

                    setCheckingAdmin(false);
                }
            }
        );

        return () => unsubscribe();

    }, []);


    // =========================================================
    // REALTIME LISTENER: AUTOMATICALLY TRANSFER APPROVED CLAIMS
    // =========================================================

    useEffect(() => {

        const claimsQuery = query(
            collectionGroup(db, "claims"),
            where("status", "==", "approved")
        );

        const processClaimTransfer = async (claimData, docId) => {
            const itemId = claimData.itemId || docId;
            if (!itemId) return;

            try {
                const reportRef = doc(db, "reports", itemId);
                const reportSnap = await getDoc(reportRef);

                if (reportSnap.exists()) {
                    const reportData = reportSnap.data();
                    const claimedRef = doc(db, "claimed_reports", itemId);

                    const batch = writeBatch(db);

                    batch.set(claimedRef, {
                        ...reportData,
                        status: "Claimed",
                        originalStatus: reportData.status || "Lost",
                        claimedAt: serverTimestamp(),
                        claimedBy: claimData.studentId || claimData.userId || "",
                        claimedByEmail: claimData.studentEmail || claimData.userEmail || ""
                    });

                    batch.delete(reportRef);

                    await batch.commit();
                }
            } catch (err) {
                console.error("Auto transfer to claimed failed:", err);
            }
        };

        const unsubscribeApprovedClaims = onSnapshot(
            claimsQuery,
            (snapshot) => {
                snapshot.docs.forEach((docSnap) => {
                    processClaimTransfer(docSnap.data(), docSnap.id);
                });
            },
            (error) => {
                console.error("Approved claims listener error:", error);
            }
        );

        return () => unsubscribeApprovedClaims();

    }, []);


    // =========================================================
    // REALTIME REPORTS
    // =========================================================

    useEffect(() => {

        const reportsQuery = query(
            collection(db, "reports")
        );

        const unsubscribeReports =
            onSnapshot(
                reportsQuery,
                (snapshot) => {

                    const data =
                        snapshot.docs
                            .map((reportDoc) => ({
                                ...reportDoc.data(),
                                id: reportDoc.id
                            }))
                            .sort(
                                (a, b) =>
                                    getTimestampValue(
                                        b.timestamp
                                    ) -
                                    getTimestampValue(
                                        a.timestamp
                                    )
                            );

                    setReports(data);
                },
                (error) => {

                    console.error(
                        "Reports listener error:",
                        error
                    );
                }
            );

        return () => unsubscribeReports();

    }, []);


    // =========================================================
    // REALTIME CLAIMED REPORTS
    // =========================================================

    useEffect(() => {

        const claimedQuery = query(
            collection(
                db,
                "claimed_reports"
            )
        );

        const unsubscribeClaimed =
            onSnapshot(
                claimedQuery,
                (snapshot) => {

                    const data =
                        snapshot.docs
                            .map((reportDoc) => ({
                                ...reportDoc.data(),
                                id: reportDoc.id
                            }))
                            .sort(
                                (a, b) =>
                                    getTimestampValue(
                                        b.claimedAt
                                    ) -
                                    getTimestampValue(
                                        a.claimedAt
                                    )
                            );

                    setClaimedReports(data);
                },
                (error) => {

                    console.error(
                        "Claimed reports listener error:",
                        error
                    );
                }
            );

        return () => unsubscribeClaimed();

    }, []);


    // =========================================================
    // REALTIME USERS
    // =========================================================

    useEffect(() => {

        const usersQuery = query(
            collection(db, "users")
        );

        const unsubscribeUsers =
            onSnapshot(
                usersQuery,
                (snapshot) => {

                    const data =
                        snapshot.docs.map(
                            (userDoc) => ({
                                ...userDoc.data(),
                                id: userDoc.id
                            })
                        );

                    setUsers(data);
                },
                (error) => {

                    console.error(
                        "Users listener error:",
                        error
                    );
                }
            );

        return () => unsubscribeUsers();

    }, []);


    // =========================================================
    // LOGOUT
    // =========================================================

    const handleLogout = async () => {

        try {

            await signOut(auth);

            if (typeof setRole === "function") {
                setRole(null);
            }

            localStorage.removeItem(
                "userRole"
            );

            navigate("/");

        } catch (error) {

            console.error(
                "Logout failed:",
                error
            );

            alert(
                "Logout failed. Please try again."
            );
        }
    };


    // =========================================================
    // ADMIN ACCESS CHECK
    // =========================================================

    const requireAdmin = () => {

        if (!currentUser) {

            alert(
                "You must be logged in to perform this action."
            );

            return false;
        }

        if (!isAdmin) {

            alert(
                "Only administrators can perform this action."
            );

            return false;
        }

        return true;
    };


    // =========================================================
    // MARK CLAIMED REPORT AS UNCLAIMED (NO INDEX REQUIRED)
    // =========================================================

    const handleMoveToUnclaimed = async (item) => {
        if (!requireAdmin()) {
            return;
        }

        if (!item?.id) {
            alert("Unable to identify this report.");
            return;
        }

        if (processingItemId === item.id) {
            return;
        }

        const itemName = item.itemName || "this item";

        const confirmed = window.confirm(
            `Mark "${itemName}" as unclaimed and return it to active reports?`
        );

        if (!confirmed) {
            return;
        }

        setProcessingItemId(item.id);

        try {
            const restoredStatus =
                item.originalStatus === "Lost" || item.originalStatus === "Found"
                    ? item.originalStatus
                    : item.status === "Lost" || item.status === "Found"
                    ? item.status
                    : "Found";

            const cleanClaimedData = { ...item };
            delete cleanClaimedData.id;
            delete cleanClaimedData.claimedAt;
            delete cleanClaimedData.claimedBy;
            delete cleanClaimedData.claimedByEmail;
            delete cleanClaimedData.originalStatus;
            delete cleanClaimedData.unclaimedAt;

            Object.keys(cleanClaimedData).forEach((key) => {
                if (cleanClaimedData[key] === undefined) {
                    delete cleanClaimedData[key];
                }
            });

            const claimedRef = doc(db, "claimed_reports", item.id);
            const reportRef = doc(db, "reports", item.id);

            const batch = writeBatch(db);

            // 1. Move back to 'reports' collection with restored status
            batch.set(reportRef, {
                ...cleanClaimedData,
                status: restoredStatus,
                timestamp: item.timestamp || serverTimestamp()
            });

            // 2. Delete from 'claimed_reports'
            batch.delete(claimedRef);

            // 3. Directly target user claims without requiring collectionGroup index
            if (item.claimedBy) {
                const claimRef = doc(db, "messages", item.claimedBy, "claims", item.id);
                batch.delete(claimRef);
            }

            // Also check all users in state as fallback to clean up claims without index error
            users.forEach((u) => {
                if (u.id) {
                    const fallbackClaimRef = doc(db, "messages", u.id, "claims", item.id);
                    batch.delete(fallbackClaimRef);
                }
            });

            await batch.commit();

            alert(`"${itemName}" has been marked as unclaimed and posted back to feeds.`);

        } catch (error) {
            console.error("Mark Unclaimed Error:", error);
            alert("Failed to mark item as unclaimed:\n" + error.message);
        } finally {
            setProcessingItemId(null);
        }
    };


    // =========================================================
    // DELETE ITEM - ADMIN ONLY
    // =========================================================

    const handleDelete = async (item) => {
        if (!requireAdmin()) {
            return;
        }

        if (!item?.id) {
            alert("Unable to identify this report.");
            return;
        }

        if (processingItemId === item.id) {
            return;
        }

        const collectionName =
            activeTab === "Claimed"
                ? "claimed_reports"
                : "reports";

        const itemName = item.itemName || "this item";

        const confirmed = window.confirm(
            `Are you sure you want to permanently delete "${itemName}"?`
        );

        if (!confirmed) {
            return;
        }

        setProcessingItemId(item.id);

        try {
            await deleteDoc(doc(db, collectionName, item.id));
            alert("Deleted successfully.");
        } catch (error) {
            console.error("Delete Error:", error);
            alert("Failed to delete:\n" + error.message);
        } finally {
            setProcessingItemId(null);
        }
    };


    // =========================================================
    // DELETE USER - ADMIN ONLY
    // =========================================================

    const handleDeleteUser = async (userToDelete) => {
        if (!requireAdmin()) {
            return;
        }

        if (!userToDelete?.id) {
            alert("Unable to identify this user.");
            return;
        }

        if (processingUserId === userToDelete.id) {
            return;
        }

        const userName =
            userToDelete.fullName ||
            userToDelete.displayName ||
            userToDelete.name ||
            userToDelete.email ||
            "this user";

        const confirmed = window.confirm(
            `Are you sure you want to delete the registered account for "${userName}"?`
        );

        if (!confirmed) {
            return;
        }

        setProcessingUserId(userToDelete.id);

        try {
            await deleteDoc(doc(db, "users", userToDelete.id));
            alert("User deleted successfully.");
        } catch (error) {
            console.error("Delete User Error:", error);
            alert("Failed to delete user:\n" + error.message);
        } finally {
            setProcessingUserId(null);
        }
    };


    // =========================================================
    // USER CATEGORIES
    // =========================================================

    const allStudents =
        users.filter(
            (user) =>
                String(
                    user.role || ""
                ).toLowerCase() ===
                    "student" ||
                (!user.role &&
                    (
                        user.schoolName ||
                        user.school
                    ))
        );

    const allGuests =
        users.filter(
            (user) =>
                String(
                    user.role || ""
                ).toLowerCase() ===
                    "guest" ||
                (
                    !user.schoolName &&
                    !user.school &&
                    String(
                        user.role || ""
                    ).toLowerCase() !==
                        "student"
                )
        );


    // =========================================================
    // TAB COUNTS
    // =========================================================

    const getCount = (type) => {

        if (type === "Claimed") {
            return claimedReports.length;
        }

        if (type === "Users") {
            return users.length;
        }

        return reports.filter(
            (report) =>
                report.status === type
        ).length;
    };


    // =========================================================
    // ITEM COUNTS
    // =========================================================

    const lostCount = getCount("Lost");
    const foundCount = getCount("Found");
    const claimedCount = getCount("Claimed");

    const totalItems =
        lostCount +
        foundCount +
        claimedCount;

    const getPercentage =
        (count) => {

            if (totalItems === 0) {
                return "0.0";
            }

            return (
                (count / totalItems) *
                100
            ).toFixed(1);
        };


    // =========================================================
    // CHART DATA
    // =========================================================

    const chartData = [
        {
            name: "Lost",
            count: lostCount,
            color: "#dc2626"
        },
        {
            name: "Found",
            count: foundCount,
            color: "#059669"
        },
        {
            name: "Claimed",
            count: claimedCount,
            color: "#062438"
        }
    ];

    const pieData =
        chartData.filter(
            (item) =>
                item.count > 0
        );


    // =========================================================
    // FILTER INVENTORY
    // =========================================================

    const filteredItems = (
        activeTab === "Claimed"
            ? claimedReports
            : reports.filter(
                  (report) =>
                      report.status ===
                      activeTab
              )
    ).filter((item) => {

        const search =
            searchTerm
                .toLowerCase()
                .trim();

        if (!search) {
            return true;
        }

        return (
            String(
                item.itemName || ""
            )
                .toLowerCase()
                .includes(search) ||

            String(
                item.landmark || ""
            )
                .toLowerCase()
                .includes(search)
        );
    });


    // =========================================================
    // FILTER USERS
    // =========================================================

    const filteredUsers =
        users.filter((user) => {

            const userName =
                user.fullName ||
                user.displayName ||
                user.name ||
                "";

            const userEmail =
                user.email || "";

            const userSchool =
                user.schoolName ||
                user.school ||
                user.university ||
                "";

            const userRole =
                user.role || "";

            const search =
                searchTerm
                    .toLowerCase()
                    .trim();

            return (
                userName
                    .toLowerCase()
                    .includes(search) ||

                userEmail
                    .toLowerCase()
                    .includes(search) ||

                userSchool
                    .toLowerCase()
                    .includes(search) ||

                userRole
                    .toLowerCase()
                    .includes(search)
            );
        });


    // =========================================================
    // DISPLAY STUDENTS & GUESTS
    // =========================================================

    const displayStudents =
        filteredUsers.filter(
            (user) =>
                String(
                    user.role || ""
                ).toLowerCase() ===
                    "student" ||
                (!user.role &&
                    (
                        user.schoolName ||
                        user.school
                    ))
        );

    const displayGuests =
        filteredUsers.filter(
            (user) =>
                String(
                    user.role || ""
                ).toLowerCase() ===
                    "guest" ||
                (
                    !user.schoolName &&
                    !user.school &&
                    String(
                        user.role || ""
                    ).toLowerCase() !==
                        "student"
                )
        );


    // =========================================================
    // GROUP STUDENTS BY SCHOOL
    // =========================================================

    const studentsBySchool =
        displayStudents.reduce(
            (groups, student) => {

                const rawSchool =
                    student.schoolName ||
                    student.school ||
                    student.university ||
                    "Unspecified School";

                const schoolName =
                    String(
                        rawSchool
                    ).trim();

                if (!groups[schoolName]) {
                    groups[schoolName] = [];
                }

                groups[schoolName].push(
                    student
                );

                return groups;

            },
            {}
        );


    // =========================================================
    // ADMIN CHECKING
    // =========================================================

    if (checkingAdmin) {

        return (
            <div className="dashboard-wrapper">

                <div className="empty-state-card dashboard-loading-card">

                    <div className="dashboard-loading-spinner">
                    </div>

                    <p>
                        Checking administrator access...
                    </p>

                </div>

            </div>
        );
    }


    // =========================================================
    // RENDER
    // =========================================================

    return (

        <div className="dashboard-wrapper">

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="dashboard-header">

                <div className="dashboard-title-area">

                    <h1>
                        Dashboard
                    </h1>

                    {isAdmin && (
                        <span className="admin-badge">
                            ADMIN
                        </span>
                    )}

                </div>

                {currentUser && (
                    <div className="dashboard-admin-profile">

                        <div className="dashboard-admin-info">

                            <img
                                src={currentUser.photoURL || DEFAULT_ICON}
                                alt="User Avatar"
                                className="dashboard-admin-avatar"
                            />

                            <div className="dashboard-admin-details">

                                <strong>
                                    {currentUser.displayName || currentUser.email || "User"}
                                </strong>

                                <span>
                                    {currentUser.email || ""}
                                </span>

                                <small>
                                    {isAdmin ? "Administrator" : "View Only Mode"}
                                </small>

                            </div>

                        </div>

                        <button
                            type="button"
                            onClick={handleLogout}
                            className="dashboard-logout-button"
                        >
                            Logout
                        </button>

                    </div>
                )}

            </div>


            {/* =================================================
                SEARCH
            ================================================= */}

            <div className="dashboard-search-wrapper">

                <input
                    type="text"
                    placeholder="Search items, locations, or users..."
                    value={searchTerm}
                    onChange={(event) =>
                        setSearchTerm(
                            event.target.value
                        )
                    }
                    className="dashboard-search"
                />

            </div>


            {/* =================================================
                ACCESS STATUS
            ================================================= */}

            <div className="dashboard-access-row">

                {isAdmin ? (

                    <span className="dashboard-access-badge admin">
                        🔐 Administrator Controls Enabled
                    </span>

                ) : (

                    <span className="dashboard-access-badge denied">
                        View Only
                    </span>

                )}

            </div>


            {/* =================================================
                ADMIN NOTICE
            ================================================= */}

            {isAdmin && (

                <div className="admin-notice">

                    <strong>
                        🔐 Administrator Controls
                    </strong>

                    <span>
                        Claim requests are transferred automatically when approved in Messages. You can return claimed reports to unclaimed or delete reports and student registrations.
                    </span>

                </div>

            )}


            {/* =================================================
                USER SUMMARY
            ================================================= */}

            <div className="registration-summary">

                <div className="summary-card">

                    <div>

                        <p className="summary-label">
                            Registered Students
                        </p>

                        <h3 className="summary-number">
                            {allStudents.length}
                        </h3>

                    </div>

                    <span className="summary-icon">
                        🎓
                    </span>

                </div>


                <div className="summary-card">

                    <div>

                        <p className="summary-label">
                            Registered Guests
                        </p>

                        <h3 className="summary-number">
                            {allGuests.length}
                        </h3>

                    </div>

                    <span className="summary-icon">
                        👤
                    </span>

                </div>

            </div>


            {/* =================================================
                ANALYTICS
            ================================================= */}

            <div className="analytics-section">

                {/* BAR CHART */}

                <div className="analytics-panel-bar">

                    <h4 className="analytics-title">
                        Inventory Volume
                    </h4>

                    <div className="analytics-chart">

                        <ResponsiveContainer
                            width="100%"
                            height="100%"
                        >

                            <BarChart
                                data={chartData}
                            >

                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="rgba(6, 36, 56, 0.15)"
                                    vertical={false}
                                />

                                <XAxis
                                    dataKey="name"
                                    tick={{
                                        fill: "#08283e",
                                        fontSize: 12
                                    }}
                                />

                                <YAxis
                                    allowDecimals={false}
                                    tick={{
                                        fill: "#08283e",
                                        fontSize: 12
                                    }}
                                />

                                <Tooltip
                                    contentStyle={{
                                        borderRadius:
                                            "12px",
                                        background:
                                            "rgba(255, 255, 255, 0.95)",
                                        border:
                                            "1px solid rgba(255, 255, 255, 0.8)",
                                        color: "#062438"
                                    }}
                                />

                                <Bar
                                    dataKey="count"
                                    radius={[
                                        5,
                                        5,
                                        0,
                                        0
                                    ]}
                                >

                                    {chartData.map(
                                        (
                                            entry,
                                            index
                                        ) => (

                                            <Cell
                                                key={
                                                    `bar-${index}`
                                                }
                                                fill={
                                                    entry.color
                                                }
                                            />

                                        )
                                    )}

                                </Bar>

                            </BarChart>

                        </ResponsiveContainer>

                    </div>

                </div>


                {/* PIE CHART */}

                <div className="analytics-panel-circular">

                    <h4 className="analytics-title">
                        Share Distribution
                    </h4>

                    <div className="distribution-content">

                        <div className="donut-container">

                            {totalItems === 0 ? (

                                <div className="empty-donut">
                                    Empty
                                </div>

                            ) : (

                                <ResponsiveContainer
                                    width="100%"
                                    height="100%"
                                >

                                    <PieChart>

                                        <Pie
                                            data={pieData}
                                            dataKey="count"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={38}
                                            outerRadius={50}
                                            paddingAngle={3}
                                        >

                                            {pieData.map(
                                                (
                                                    entry,
                                                    index
                                                ) => (

                                                    <Cell
                                                        key={
                                                            `pie-${index}`
                                                        }
                                                        fill={
                                                            entry.color
                                                        }
                                                    />

                                                )
                                            )}

                                        </Pie>

                                    </PieChart>

                                </ResponsiveContainer>

                            )}

                        </div>


                        <div className="metric-buttons">

                            {chartData.map(
                                (item) => (

                                    <button
                                        key={
                                            item.name
                                        }
                                        type="button"
                                        onClick={() =>
                                            setActiveTab(
                                                item.name
                                            )
                                        }
                                        className={`metric-button ${
                                            activeTab ===
                                            item.name
                                                ? "metric-button-active"
                                                : ""
                                        }`}
                                        style={{
                                            "--metric-color":
                                                item.color
                                        }}
                                    >

                                        <span className="metric-name">

                                            <span
                                                className="metric-dot"
                                                style={{
                                                    backgroundColor:
                                                        item.color
                                                }}
                                            />

                                            {item.name}

                                        </span>

                                        <span className="metric-percentage">

                                            {
                                                getPercentage(
                                                    item.count
                                                )
                                            }
                                            %

                                        </span>

                                    </button>

                                )
                            )}

                        </div>

                    </div>

                </div>

            </div>


            {/* =================================================
                TABS
            ================================================= */}

            <div className="tab-navigation">

                {[
                    "Lost",
                    "Found",
                    "Claimed",
                    "Users"
                ].map((tab) => (

                    <button
                        key={tab}
                        type="button"
                        onClick={() =>
                            setActiveTab(tab)
                        }
                        className={`tab-button ${
                            activeTab === tab
                                ? "active"
                                : ""
                        }`}
                    >

                        {tab}

                        <span className="tab-badge">
                            {getCount(tab)}
                        </span>

                    </button>

                ))}

            </div>


            {/* =================================================
                USERS VIEW
            ================================================= */}

            {activeTab === "Users" ? (

                <div className="users-section">

                    {/* STUDENTS */}

                    <div className="students-group-wrapper">

                        <h3 className="section-heading">
                            🎓 Registered Students
                            (By School)
                        </h3>


                        {Object.keys(
                            studentsBySchool
                        ).length === 0 ? (

                            <p className="empty-text">
                                No students registered
                                yet.
                            </p>

                        ) : (

                            Object.entries(
                                studentsBySchool
                            ).map(
                                ([
                                    school,
                                    studentList
                                ]) => (

                                    <div
                                        key={school}
                                        className="school-group-card"
                                    >

                                        <div className="school-heading-row">

                                            <h4 className="school-name">
                                                🏫{" "}
                                                {school}
                                            </h4>

                                            <span className="count-tag">
                                                {
                                                    studentList.length
                                                }
                                            </span>

                                        </div>


                                        <div className="user-grid">

                                            {studentList.map(
                                                (
                                                    student
                                                ) => {

                                                    const name =
                                                        student.fullName ||
                                                        student.displayName ||
                                                        student.name ||
                                                        "Unnamed Student";

                                                    const isUserProcessing =
                                                        processingUserId === student.id;


                                                    return (

                                                        <div
                                                            key={
                                                                student.id
                                                            }
                                                            className="user-card"
                                                            style={{ position: "relative" }}
                                                        >

                                                            {/* DELETE STUDENT BUTTON */}
                                                            {isAdmin && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteUser(student)}
                                                                    disabled={isUserProcessing}
                                                                    title="Delete Student"
                                                                    style={{
                                                                        position: "absolute",
                                                                        top: "10px",
                                                                        right: "10px",
                                                                        background: "#ef4444",
                                                                        color: "#fff",
                                                                        border: "none",
                                                                        borderRadius: "6px",
                                                                        width: "26px",
                                                                        height: "26px",
                                                                        cursor: isUserProcessing ? "not-allowed" : "pointer",
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        justifyContent: "center",
                                                                        fontSize: "14px",
                                                                        opacity: isUserProcessing ? 0.6 : 1,
                                                                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                                                                    }}
                                                                >
                                                                    {isUserProcessing ? "..." : "🗑️"}
                                                                </button>
                                                            )}

                                                            <div className="user-avatar">

                                                                {name
                                                                    .charAt(
                                                                        0
                                                                    )
                                                                    .toUpperCase()}

                                                            </div>


                                                            <div className="user-info">

                                                                <p className="user-name">
                                                                    {
                                                                        name
                                                                    }
                                                                </p>

                                                                <p className="user-email">
                                                                    ✉️{" "}
                                                                    {
                                                                        student.email ||
                                                                        "No email"
                                                                    }
                                                                </p>

                                                                {student.studentId && (

                                                                    <p className="user-meta">
                                                                        🆔 ID:{" "}
                                                                        {
                                                                            student.studentId
                                                                        }
                                                                    </p>

                                                                )}

                                                                {student.phone && (

                                                                    <p className="user-meta">
                                                                        📞{" "}
                                                                        {
                                                                            student.phone
                                                                        }
                                                                    </p>

                                                                )}

                                                            </div>

                                                        </div>

                                                    );
                                                }
                                            )}

                                        </div>

                                    </div>

                                )
                            )

                        )}

                    </div>


                    {/* GUESTS */}

                    <div className="guests-group-wrapper">

                        <h3 className="section-heading guests-heading">
                            👤 Registered Guests (
                            {
                                displayGuests.length
                            }
                            )
                        </h3>


                        {displayGuests.length === 0 ? (

                            <p className="empty-text">
                                No guests registered.
                            </p>

                        ) : (

                            <div className="user-grid">

                                {displayGuests.map(
                                    (guest) => {

                                        const name =
                                            guest.fullName ||
                                            guest.displayName ||
                                            guest.name ||
                                            "Unnamed Guest";

                                        const contact =
                                            guest.phone ||
                                            guest.contact;

                                        const isUserProcessing =
                                            processingUserId === guest.id;


                                        return (

                                            <div
                                                key={
                                                    guest.id
                                                }
                                                className="user-card guest-card"
                                                style={{ position: "relative" }}
                                            >

                                                {/* DELETE GUEST BUTTON */}
                                                {isAdmin && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteUser(guest)}
                                                        disabled={isUserProcessing}
                                                        title="Delete Guest"
                                                        style={{
                                                            position: "absolute",
                                                            top: "10px",
                                                            right: "10px",
                                                            background: "#ef4444",
                                                            color: "#fff",
                                                            border: "none",
                                                            borderRadius: "6px",
                                                            width: "26px",
                                                            height: "26px",
                                                            cursor: isUserProcessing ? "not-allowed" : "pointer",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            fontSize: "14px",
                                                            opacity: isUserProcessing ? 0.6 : 1,
                                                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                                                        }}
                                                    >
                                                        {isUserProcessing ? "..." : "🗑️"}
                                                    </button>
                                                )}

                                                <div className="user-avatar guest-avatar">

                                                    {name
                                                        .charAt(
                                                            0
                                                        )
                                                        .toUpperCase()}

                                                </div>


                                                <div className="user-info">

                                                    <p className="user-name">
                                                        {name}
                                                    </p>

                                                    <p className="user-email">
                                                        ✉️{" "}
                                                        {
                                                            guest.email ||
                                                            "No email"
                                                        }
                                                    </p>

                                                    {contact && (

                                                        <p className="user-meta">
                                                            📞{" "}
                                                            {
                                                                contact
                                                            }
                                                        </p>

                                                    )}

                                                </div>

                                            </div>

                                        );
                                    }
                                )}

                            </div>

                        )}

                    </div>

                </div>

            ) : (

                /* =================================================
                    INVENTORY VIEW
                ================================================= */

                <div className="content-grid">

                    {filteredItems.length === 0 ? (

                        <div className="empty-state-card">

                            <p>
                                No reports found in
                                this section.
                            </p>

                        </div>

                    ) : (

                        filteredItems.map(
                            (item) => {

                                const isProcessing =
                                    processingItemId ===
                                    item.id;


                                return (

                                    <div
                                        key={item.id}
                                        className="item-card"
                                    >

                                        {/* IMAGE */}

                                        <div className="item-image-wrapper">

                                            {item.imageUrl ? (

                                                <img
                                                    src={
                                                        item.imageUrl
                                                    }
                                                    alt={
                                                        item.itemName ||
                                                        "Reported item"
                                                    }
                                                    className="item-image"
                                                    onError={(event) => {
                                                        event.currentTarget.style.display =
                                                            "none";
                                                        if (event.currentTarget.nextElementSibling) {
                                                            event.currentTarget.nextElementSibling.style.display =
                                                                "flex";
                                                        }
                                                    }}
                                                />

                                            ) : null}


                                            <div
                                                className="item-image-placeholder"
                                                style={{
                                                    display:
                                                        item.imageUrl
                                                            ? "none"
                                                            : "flex"
                                                }}
                                            >
                                                No Image
                                            </div>

                                        </div>


                                        {/* DETAILS */}

                                        <div className="item-details">

                                            <h3 className="item-name">
                                                {
                                                    item.itemName ||
                                                    "Unnamed Item"
                                                }
                                            </h3>


                                            <p className="item-location">
                                                📍{" "}
                                                {
                                                    item.landmark ||
                                                    "No location provided"
                                                }
                                            </p>


                                            {item.description && (

                                                <p className="item-description">
                                                    {
                                                        item.description
                                                    }
                                                </p>

                                            )}


                                            <p className="item-timestamp">
                                                🕒{" "}

                                                {activeTab ===
                                                    "Claimed" &&
                                                item.claimedAt
                                                    ? formatTimestamp(
                                                          item.claimedAt
                                                      )
                                                    : formatTimestamp(
                                                          item.timestamp
                                                      )}

                                            </p>


                                            {/* CLAIMED INFORMATION */}

                                            {activeTab ===
                                                "Claimed" && (

                                                <div className="claimed-status">

                                                    ✓ Claimed

                                                    {item.originalStatus && (
                                                        <span>
                                                            {" "}
                                                            • Originally{" "}
                                                            {
                                                                item.originalStatus
                                                            }
                                                        </span>
                                                    )}

                                                </div>

                                            )}

                                        </div>


                                        {/* ADMIN ACTIONS */}

                                        {isAdmin && (

                                            <div className="item-actions">

                                                {activeTab ===
                                                    "Claimed" && (

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleMoveToUnclaimed(
                                                                item
                                                            )
                                                        }
                                                        disabled={
                                                            isProcessing
                                                        }
                                                        className="btn-mark-unclaimed"
                                                    >

                                                        {isProcessing
                                                            ? "Processing..."
                                                            : "↩ Mark Unclaimed"}

                                                    </button>

                                                )}


                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleDelete(
                                                            item
                                                        )
                                                    }
                                                    disabled={
                                                        isProcessing
                                                    }
                                                    className="btn-delete"
                                                >

                                                    {isProcessing
                                                        ? "..."
                                                        : "Delete"}

                                                </button>

                                            </div>

                                        )}

                                    </div>

                                );
                            }
                        )

                    )}

                </div>

            )}

        </div>
    );
}

export default Dashboard;