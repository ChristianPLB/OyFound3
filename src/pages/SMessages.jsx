import { onAuthStateChanged } from "firebase/auth";

import {
    addDoc,
    collection,
    doc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    where
} from "firebase/firestore";

import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import { auth, db } from "../firebase";


const DEFAULT_ICON =
    "https://cdn-icons-png.flaticon.com/512/149/149071.png";

const CLOUDINARY_CLOUD_NAME = "dvfykqznw";
const CLOUDINARY_UPLOAD_PRESET = "messages";


/* =========================================================
   CONVERSATION ID
   ---------------------------------------------------------
   Every student + admin pair gets a different conversation.
========================================================= */

const getConversationId = (studentId, adminId) => {
    return `${studentId}__${adminId}`;
};


/* =========================================================
   NAME HELPER
========================================================= */

const getFullName = (profile) => {
    if (!profile) return "Unknown";

    const firstName =
        profile.firstName ||
        profile.firstname ||
        "";

    const lastName =
        profile.lastName ||
        profile.lastname ||
        "";

    const fullName =
        `${firstName} ${lastName}`.trim();

    if (fullName) return fullName;

    if (profile.fullName?.trim()) {
        return profile.fullName.trim();
    }

    if (profile.displayName?.trim()) {
        return profile.displayName.trim();
    }

    if (profile.email) {
        return profile.email.split("@")[0];
    }

    return "Unknown";
};


/* =========================================================
   SMessages
========================================================= */

function SMessages() {

    /* =====================================================
       AUTH
    ===================================================== */

    const [user, setUser] = useState(null);

    const [studentProfile, setStudentProfile] =
        useState(null);


    /* =====================================================
       ADMINS
    ===================================================== */

    const [admins, setAdmins] = useState([]);

    const [selectedAdmin, setSelectedAdmin] =
        useState(null);


    /* =====================================================
       CHAT
    ===================================================== */

    const [studentMessage, setStudentMessage] =
        useState("");

    const [chatHistory, setChatHistory] =
        useState([]);

    const [imageFile, setImageFile] =
        useState(null);

    const [uploading, setUploading] =
        useState(false);


    /* =====================================================
       CLAIMS
    ===================================================== */

    const [userClaims, setUserClaims] =
        useState([]);


    /* =====================================================
       REFS
    ===================================================== */

    const chatEndRef = useRef(null);

    const fileInputRef = useRef(null);


    /* =====================================================
       CURRENT USER ID
    ===================================================== */

    const studentDocId = useMemo(() => {
        return user?.uid || null;
    }, [user]);


    /* =====================================================
       AUTH LISTENER
    ===================================================== */

    useEffect(() => {

        const unsubscribe = onAuthStateChanged(
            auth,
            (currentUser) => {
                setUser(currentUser);
            }
        );

        return () => unsubscribe();

    }, []);


    /* =====================================================
       LOAD STUDENT PROFILE
    ===================================================== */

    useEffect(() => {

        if (!user?.uid) {
            setStudentProfile(null);
            return;
        }

        const userRef = doc(
            db,
            "users",
            user.uid
        );

        const unsubscribe = onSnapshot(
            userRef,
            (snapshot) => {

                if (snapshot.exists()) {
                    setStudentProfile(
                        snapshot.data()
                    );
                }
            }
        );

        return () => unsubscribe();

    }, [user]);


    /* =====================================================
       LOAD ALL ADMINS
       -----------------------------------------------------
       Each admin is shown separately.
       No "Admin" prefix is added to names.
    ===================================================== */

    useEffect(() => {

        if (!user) return;

        const adminsQuery = query(
            collection(db, "users"),
            where("role", "==", "admin")
        );

        const unsubscribe = onSnapshot(
            adminsQuery,
            (snapshot) => {

                const adminList =
                    snapshot.docs.map(
                        (adminDoc) => {

                            const data =
                                adminDoc.data();

                            return {
                                id: adminDoc.id,
                                ...data,
                                fullName:
                                    getFullName(data),
                                avatarUrl:
                                    data.photoURL ||
                                    data.avatarUrl ||
                                    DEFAULT_ICON,
                                isOnline:
                                    data.isOnline === true ||
                                    data.online === true ||
                                    data.status === "online",
                            };
                        }
                    );

                adminList.sort((a, b) =>
                    a.fullName.localeCompare(
                        b.fullName
                    )
                );

                setAdmins(adminList);

                setSelectedAdmin((current) => {

                    if (!adminList.length) {
                        return null;
                    }

                    if (current) {

                        const updated =
                            adminList.find(
                                (admin) =>
                                    admin.id ===
                                    current.id
                            );

                        if (updated) {
                            return updated;
                        }
                    }

                    return adminList[0];
                });
            }
        );

        return () => unsubscribe();

    }, [user]);


    /* =====================================================
       CURRENT CONVERSATION ID
    ===================================================== */

    const conversationId = useMemo(() => {

        if (!studentDocId) return null;

        if (!selectedAdmin?.id) return null;

        return getConversationId(
            studentDocId,
            selectedAdmin.id
        );

    }, [
        studentDocId,
        selectedAdmin?.id,
    ]);


    /* =====================================================
       CLEAR STUDENT UNREAD STATUS
    ===================================================== */

    useEffect(() => {

        if (!conversationId) return;

        const conversationRef =
            doc(
                db,
                "messages",
                conversationId
            );

        setDoc(
            conversationRef,
            {
                unreadStudent: false,
            },
            {
                merge: true,
            }
        ).catch(() => {});

    }, [conversationId]);


    /* =====================================================
       LISTEN TO CURRENT CONVERSATION
    ===================================================== */

    useEffect(() => {

        if (!conversationId) {
            setChatHistory([]);
            return;
        }

        const repliesQuery = query(
            collection(
                db,
                "messages",
                conversationId,
                "replies"
            ),
            orderBy("timestamp", "asc")
        );

        const unsubscribe = onSnapshot(
            repliesQuery,
            (snapshot) => {

                setChatHistory(
                    snapshot.docs.map(
                        (messageDoc) => ({
                            id: messageDoc.id,
                            ...messageDoc.data(),
                        })
                    )
                );
            }
        );

        return () => unsubscribe();

    }, [conversationId]);


    /* =====================================================
       LISTEN TO CLAIMS
       -----------------------------------------------------
       New claims:
       messages/{studentId__adminId}/claims

       Legacy claims are also loaded:
       messages/{studentId}/claims

       This keeps older claim records working.
    ===================================================== */

    useEffect(() => {

        if (!user?.uid) {
            setUserClaims([]);
            return;
        }

        let conversationClaims = [];
        let legacyClaims = [];

        const updateClaims = () => {

            const combined = [
                ...conversationClaims,
                ...legacyClaims,
            ];

            const unique = [];

            combined.forEach((claim) => {

                const exists =
                    unique.some(
                        (item) =>
                            item.id === claim.id
                    );

                if (!exists) {
                    unique.push(claim);
                }
            });

            setUserClaims(unique);
        };


        const unsubscribers = [];


        /* New conversation claims */

        if (conversationId) {

            const newClaimsRef =
                collection(
                    db,
                    "messages",
                    conversationId,
                    "claims"
                );

            const unsubscribeNew =
                onSnapshot(
                    newClaimsRef,
                    (snapshot) => {

                        conversationClaims =
                            snapshot.docs.map(
                                (claimDoc) => ({
                                    id: claimDoc.id,
                                    ...claimDoc.data(),
                                })
                            );

                        updateClaims();
                    }
                );

            unsubscribers.push(
                unsubscribeNew
            );
        }


        /* Existing/legacy claims */

        const legacyClaimsRef =
            collection(
                db,
                "messages",
                user.uid,
                "claims"
            );

        const unsubscribeLegacy =
            onSnapshot(
                legacyClaimsRef,
                (snapshot) => {

                    legacyClaims =
                        snapshot.docs.map(
                            (claimDoc) => ({
                                id: claimDoc.id,
                                ...claimDoc.data(),
                            })
                        );

                    updateClaims();
                }
            );

        unsubscribers.push(
            unsubscribeLegacy
        );


        return () => {
            unsubscribers.forEach(
                (unsubscribe) =>
                    unsubscribe()
            );
        };

    }, [
        user?.uid,
        conversationId,
    ]);


    /* =====================================================
       AUTO SCROLL
    ===================================================== */

    useEffect(() => {

        chatEndRef.current?.scrollIntoView({
            behavior: "smooth",
        });

    }, [chatHistory]);


    /* =====================================================
       FORMAT DATE
    ===================================================== */

    const formatDateTime = (timestamp) => {

        if (!timestamp) {
            return "Sending...";
        }

        const date =
            timestamp?.toDate
                ? timestamp.toDate()
                : new Date(timestamp);

        return date.toLocaleString([], {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };


    /* =====================================================
       CLOUDINARY
    ===================================================== */

    const uploadToCloudinary = async (file) => {

        const formData = new FormData();

        formData.append(
            "file",
            file
        );

        formData.append(
            "upload_preset",
            CLOUDINARY_UPLOAD_PRESET
        );

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
            {
                method: "POST",
                body: formData,
            }
        );

        if (!response.ok) {

            const errorData =
                await response
                    .json()
                    .catch(() => ({}));

            throw new Error(
                errorData.error?.message ||
                "Cloudinary Upload Failed"
            );
        }

        const data =
            await response.json();

        return data.secure_url;
    };


    /* =====================================================
       SEND MESSAGE
    ===================================================== */

    const handleSendToAdmin = async () => {

        if (
            (!studentMessage.trim() &&
                !imageFile) ||
            !user ||
            !studentDocId ||
            !selectedAdmin?.id ||
            !conversationId
        ) {
            alert(
                "Please select an admin and type a message or select an image."
            );

            return;
        }

        try {

            setUploading(true);

            let imageUrl = null;

            if (imageFile) {
                imageUrl =
                    await uploadToCloudinary(
                        imageFile
                    );
            }


            /* ---------------------------------------------
               STUDENT NAME
            --------------------------------------------- */

            const activeFirstName =
                studentProfile?.firstName ||
                studentProfile?.firstname ||
                "";

            const activeLastName =
                studentProfile?.lastName ||
                studentProfile?.lastname ||
                "";

            const activeEmail =
                user.email || "";

            const finalStudentName =
                `${activeFirstName} ${activeLastName}`.trim() ||
                studentProfile?.fullName ||
                user.displayName ||
                activeEmail.split("@")[0] ||
                "User";


            /* ---------------------------------------------
               MAIN CONVERSATION
            --------------------------------------------- */

            const conversationRef =
                doc(
                    db,
                    "messages",
                    conversationId
                );

            await setDoc(
                conversationRef,
                {
                    studentId:
                        studentDocId,

                    adminId:
                        selectedAdmin.id,

                    firstName:
                        activeFirstName,

                    lastName:
                        activeLastName,

                    fullName:
                        finalStudentName,

                    email:
                        activeEmail,

                    avatarUrl:
                        user.photoURL ||
                        studentProfile?.photoURL ||
                        DEFAULT_ICON,

                    adminName:
                        selectedAdmin.fullName,

                    adminEmail:
                        selectedAdmin.email ||
                        "",

                    adminAvatar:
                        selectedAdmin.avatarUrl ||
                        DEFAULT_ICON,

                    message:
                        imageUrl
                            ? "📷 Sent an image"
                            : studentMessage,

                    timestamp:
                        serverTimestamp(),

                    unread:
                        true,

                    unreadStudent:
                        false,
                },
                {
                    merge: true,
                }
            );


            /* ---------------------------------------------
               MESSAGE REPLY
            --------------------------------------------- */

            await addDoc(
                collection(
                    db,
                    "messages",
                    conversationId,
                    "replies"
                ),
                {
                    text:
                        studentMessage || "",

                    imageUrl:
                        imageUrl,

                    sender:
                        "student",

                    senderName:
                        finalStudentName,

                    senderId:
                        user.uid,

                    role:
                        "student",

                    timestamp:
                        serverTimestamp(),
                }
            );


            /* ---------------------------------------------
               RESET INPUT
            --------------------------------------------- */

            setStudentMessage("");

            setImageFile(null);

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

        } catch (error) {

            console.error(
                "Failed to send message:",
                error
            );

            alert(
                "Failed to send message."
            );

        } finally {

            setUploading(false);
        }
    };


    /* =====================================================
       LOGIN SCREEN
    ===================================================== */

    if (!user) {

        return (
            <div className="messages-container login-prompt">

                <div className="login-overlay">

                    <div className="login-card">

                        <h2>
                            Login Required
                        </h2>

                        <p>
                            Please log in to access support chat
                        </p>

                        <button
                            className="login-btn"
                            onClick={() =>
                                window.location.href =
                                    "/login"
                            }
                        >
                            Go to Login
                        </button>

                    </div>

                </div>

            </div>
        );
    }


    /* =====================================================
       MAIN UI
    ===================================================== */

    return (

        <div className="messages-container">

            {/* =================================================
                SIDEBAR
            ================================================= */}

            <div className="messages-sidebar">

                <div className="sidebar-header">

                    <h2>
                        Support
                    </h2>

                    <small style={{ color: "#666" }}>
                        You:{" "}
                        <b>
                            {getFullName(
                                studentProfile
                            )}
                        </b>
                    </small>

                </div>


                <div className="conversation-list">

                    {admins.length === 0 && (

                        <div
                            style={{
                                padding: "20px",
                                textAlign: "center",
                                color: "#777",
                            }}
                        >
                            No admins available.
                        </div>

                    )}


                    {admins.map((admin) => (

                        <div
                            key={admin.id}
                            className={`convo-item ${
                                selectedAdmin?.id === admin.id
                                    ? "active"
                                    : ""
                            }`}
                            onClick={() =>
                                setSelectedAdmin(admin)
                            }
                        >

                            <div
                                className="convo-avatar-wrapper"
                                style={{
                                    position:
                                        "relative",
                                }}
                            >

                                <img
                                    src={
                                        admin.avatarUrl
                                    }
                                    alt=""
                                    className="convo-avatar"
                                />

                                {admin.isOnline && (

                                    <span
                                        title="Online"
                                        style={{
                                            position:
                                                "absolute",
                                            bottom: "2px",
                                            right: "2px",
                                            width: "12px",
                                            height: "12px",
                                            backgroundColor:
                                                "#059669",
                                            border:
                                                "2px solid #ffffff",
                                            borderRadius:
                                                "50%",
                                            boxShadow:
                                                "0 0 6px rgba(5, 150, 105, 0.5)",
                                        }}
                                    />

                                )}

                            </div>


                            <div className="convo-info">

                                <strong>
                                    {admin.fullName}
                                </strong>

                                <p
                                    className="convo-preview"
                                    style={{
                                        color:
                                            admin.isOnline
                                                ? "#22c55e"
                                                : "#888",
                                    }}
                                >
                                   
                                </p>

                            </div>

                        </div>

                    ))}

                </div>

            </div>


            {/* =================================================
                CHAT
            ================================================= */}

            <div className="chat-main-area">

                {selectedAdmin ? (

                    <>

                        {/* =====================================
                            HEADER
                        ===================================== */}

                        <div className="chat-header">

                            <div className="chat-header-user">

                                <div
                                    style={{
                                        position:
                                            "relative",
                                        display:
                                            "inline-block",
                                    }}
                                >

                                    <img
                                        src={
                                            selectedAdmin.avatarUrl
                                        }
                                        alt=""
                                        className="header-avatar"
                                    />

                                    {selectedAdmin.isOnline && (

                                        <span
                                            title="Online"
                                            style={{
                                                position:
                                                    "absolute",
                                                bottom: "2px",
                                                right: "2px",
                                                width: "12px",
                                                height: "12px",
                                                backgroundColor:
                                                    "#059669",
                                                border:
                                                    "2px solid #ffffff",
                                                borderRadius:
                                                    "50%",
                                            }}
                                        />

                                    )}

                                </div>


                                <div>

                                    <h4>
                                        {
                                            selectedAdmin.fullName
                                        }
                                    </h4>

                                    <span
                                        style={{
                                            color:
                                                selectedAdmin.isOnline
                                                    ? "#22c55e"
                                                    : "#888",
                                        }}
                                    >
                                        {selectedAdmin.isOnline
                                            ? "Online"
                                            : "Offline"}
                                    </span>

                                </div>

                            </div>

                        </div>


                        {/* =====================================
                            CHAT HISTORY
                        ===================================== */}

                        <div className="chat-history">

                            {chatHistory.map((msg) => {

                                const isYourMessage =
                                    msg.role ===
                                        "student" ||
                                    msg.sender ===
                                        "student" ||
                                    msg.senderId ===
                                        user.uid;

                                return (

                                    <div
                                        key={msg.id}
                                        className={`msg-row ${
                                            isYourMessage
                                                ? "msg-sent"
                                                : "msg-received"
                                        }`}
                                    >

                                        {!isYourMessage && (

                                            <img
                                                src={
                                                    selectedAdmin.avatarUrl
                                                }
                                                alt=""
                                                className="msg-avatar"
                                            />

                                        )}


                                        <div
                                            className={
                                                isYourMessage
                                                    ? "sent-container"
                                                    : "received-container"
                                            }
                                        >

                                            <div
                                                className={`msg-bubble ${
                                                    isYourMessage
                                                        ? "sent"
                                                        : "received"
                                                }`}
                                            >

                                                {msg.imageUrl && (

                                                    <img
                                                        src={
                                                            msg.imageUrl
                                                        }
                                                        alt=""
                                                        style={{
                                                            maxWidth:
                                                                "200px",
                                                            borderRadius:
                                                                "8px",
                                                            display:
                                                                "block",
                                                            marginBottom:
                                                                msg.text
                                                                    ? "8px"
                                                                    : "0",
                                                        }}
                                                    />

                                                )}

                                                {msg.text && (
                                                    <span>
                                                        {
                                                            msg.text
                                                        }
                                                    </span>
                                                )}

                                            </div>


                                            <span className="msg-time">

                                                {
                                                    formatDateTime(
                                                        msg.timestamp
                                                    )
                                                }

                                                {isYourMessage && (

                                                    <span
                                                        className="sender-tag"
                                                        style={{
                                                            marginLeft:
                                                                "6px",
                                                        }}
                                                    >
                                                        You
                                                    </span>

                                                )}

                                            </span>

                                        </div>

                                    </div>

                                );
                            })}


                            {chatHistory.length === 0 && (

                                <div className="msg-row msg-received">

                                    <img
                                        src={
                                            selectedAdmin.avatarUrl
                                        }
                                        alt=""
                                        className="msg-avatar"
                                    />

                                    <div className="received-container">

                                        <div className="msg-bubble">

                                            Hello! How can we help you today?

                                        </div>

                                    </div>

                                </div>

                            )}

                            <div ref={chatEndRef} />

                        </div>


                        {/* =====================================
                            INPUT
                        ===================================== */}

                        <div className="chat-input-section">

                            {imageFile && (

                                <div
                                    style={{
                                        padding:
                                            "5px 10px",
                                        display:
                                            "flex",
                                        alignItems:
                                            "center",
                                        background:
                                            "#f0f0f0",
                                        gap: "10px",
                                    }}
                                >

                                    <span
                                        style={{
                                            fontSize:
                                                "12px",
                                        }}
                                    >
                                        📷 Attachment:{" "}
                                        {
                                            imageFile.name
                                        }
                                    </span>

                                    <button
                                        style={{
                                            border:
                                                "none",
                                            background:
                                                "none",
                                            color:
                                                "red",
                                            cursor:
                                                "pointer",
                                        }}
                                        onClick={() => {

                                            setImageFile(
                                                null
                                            );

                                            if (
                                                fileInputRef.current
                                            ) {
                                                fileInputRef.current.value =
                                                    "";
                                            }

                                        }}
                                    >
                                        ✕
                                    </button>

                                </div>

                            )}


                            <div className="input-box-container">

                                <div
                                    className="input-with-sender"
                                    style={{
                                        display:
                                            "flex",
                                        alignItems:
                                            "center",
                                        width:
                                            "100%",
                                    }}
                                >

                                    <label
                                        htmlFor="file-upload"
                                        style={{
                                            cursor:
                                                "pointer",
                                            padding:
                                                "0 10px",
                                            fontSize:
                                                "20px",
                                        }}
                                    >
                                        📎
                                    </label>

                                    <input
                                        id="file-upload"
                                        type="file"
                                        accept="image/*"
                                        ref={
                                            fileInputRef
                                        }
                                        style={{
                                            display:
                                                "none",
                                        }}
                                        onChange={(e) =>
                                            setImageFile(
                                                e.target.files?.[0] ||
                                                null
                                            )
                                        }
                                        disabled={
                                            uploading
                                        }
                                    />

                                    <textarea
                                        placeholder={
                                            uploading
                                                ? "Uploading..."
                                                : "Type your message..."
                                        }
                                        value={
                                            studentMessage
                                        }
                                        disabled={
                                            uploading
                                        }
                                        onChange={(e) =>
                                            setStudentMessage(
                                                e.target.value
                                            )
                                        }
                                        onKeyDown={(e) => {

                                            if (
                                                e.key ===
                                                    "Enter" &&
                                                !e.shiftKey
                                            ) {

                                                e.preventDefault();

                                                handleSendToAdmin();
                                            }

                                        }}
                                    />

                                    <span className="sender-tag-right">

                                        {
                                            getFullName(
                                                studentProfile
                                            )
                                        }

                                    </span>

                                </div>


                                <button
                                    className="send-btn"
                                    onClick={
                                        handleSendToAdmin
                                    }
                                    disabled={
                                        uploading ||
                                        (
                                            !studentMessage.trim() &&
                                            !imageFile
                                        )
                                    }
                                >
                                    {uploading
                                        ? "..."
                                        : "Send"}
                                </button>

                            </div>

                        </div>

                    </>

                ) : (

                    <div className="empty-chat-state">

                        <p>
                            No administrator available.
                        </p>

                    </div>

                )}

            </div>

        </div>
    );
}


export default SMessages;