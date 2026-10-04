import { onAuthStateChanged } from "firebase/auth";

import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
    writeBatch,
} from "firebase/firestore";

import {
    useEffect,
    useRef,
    useState,
} from "react";

import {
    useLocation,
    useNavigate,
} from "react-router-dom";

import "../css/Messages.css";

import { auth, db } from "../firebase";


const DEFAULT_ICON =
    "https://cdn-icons-png.flaticon.com/512/149/149071.png";

const CLOUDINARY_CLOUD_NAME = "dvfykqznw";
const CLOUDINARY_UPLOAD_PRESET = "messages";


/* =========================================================
   CONVERSATION ID
========================================================= */

const getConversationId = (
    studentId,
    adminId
) => {
    return `${studentId}__${adminId}`;
};


/* =========================================================
   FULL NAME
========================================================= */

const getFullName = (profile) => {

    if (!profile) {
        return "Anonymous User";
    }

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

    if (fullName) {
        return fullName;
    }

    if (profile.fullName?.trim()) {
        return profile.fullName.trim();
    }

    if (profile.displayName?.trim()) {
        return profile.displayName.trim();
    }

    if (profile.email) {
        return profile.email.split("@")[0];
    }

    return "Anonymous User";
};


/* =========================================================
   ADMIN MESSAGES
========================================================= */

function Messages() {

    /* =====================================================
       AUTH
    ===================================================== */

    const [currentUser, setCurrentUser] =
        useState(null);

    const [currentUserProfile, setCurrentUserProfile] =
        useState(null);


    /* =====================================================
       CONVERSATIONS
    ===================================================== */

    const [conversations, setConversations] =
        useState([]);

    const [selectedChat, setSelectedChat] =
        useState(null);


    /* =====================================================
       UI
    ===================================================== */

    const [loading, setLoading] =
        useState(true);

    const [replyText, setReplyText] =
        useState("");

    const [chatHistory, setChatHistory] =
        useState([]);

    const [contextMenu, setContextMenu] =
        useState(null);

    const [imageFile, setImageFile] =
        useState(null);

    const [uploading, setUploading] =
        useState(false);


    /* =====================================================
       PROFILES
    ===================================================== */

    const [userProfilesMap, setUserProfilesMap] =
        useState({});


    /* =====================================================
       CLAIMS
    ===================================================== */

    const [activeUserClaims, setActiveUserClaims] =
        useState([]);


    /* =====================================================
       REFS
    ===================================================== */

    const chatEndRef =
        useRef(null);

    const fileInputRef =
        useRef(null);

    const selectedChatIdRef =
        useRef(null);


    /* =====================================================
       ROUTER
    ===================================================== */

    const location =
        useLocation();

    const navigate =
        useNavigate();


    /* =====================================================
       SELECTED CHAT REF
    ===================================================== */

    useEffect(() => {

        selectedChatIdRef.current =
            selectedChat?.id || null;

    }, [selectedChat]);


    /* =====================================================
       DATE
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
       AUTH LISTENER
    ===================================================== */

    useEffect(() => {

        let unsubscribeProfile =
            () => {};

        const unsubscribeAuth =
            onAuthStateChanged(
                auth,
                (user) => {

                    setCurrentUser(user);

                    if (!user) {

                        setCurrentUserProfile(null);
                        setLoading(false);

                        return;
                    }


                    const profileRef =
                        doc(
                            db,
                            "users",
                            user.uid
                        );


                    unsubscribeProfile =
                        onSnapshot(
                            profileRef,
                            (snapshot) => {

                                if (
                                    snapshot.exists()
                                ) {

                                    setCurrentUserProfile(
                                        snapshot.data()
                                    );
                                }

                                setLoading(false);
                            },
                            (error) => {

                                console.error(
                                    "Admin profile error:",
                                    error
                                );

                                setLoading(false);
                            }
                        );
                }
            );


        return () => {

            unsubscribeAuth();
            unsubscribeProfile();

        };

    }, []);


    /* =====================================================
       LOAD ALL USER PROFILES
       -----------------------------------------------------
       Used for live names, avatars and online status.
    ===================================================== */

    useEffect(() => {

        if (!currentUser) {
            return;
        }

        const usersRef =
            collection(db, "users");

        const unsubscribe =
            onSnapshot(
                usersRef,
                (snapshot) => {

                    const profiles = {};

                    snapshot.docs.forEach(
                        (userDoc) => {

                            profiles[userDoc.id] =
                                userDoc.data();
                        }
                    );

                    setUserProfilesMap(
                        profiles
                    );
                }
            );


        return () => unsubscribe();

    }, [currentUser]);


    /* =====================================================
       LOAD ONLY THIS ADMIN'S CONVERSATIONS
       -----------------------------------------------------
       IMPORTANT:
       This prevents Admin A from opening Admin B's chat.
    ===================================================== */

    useEffect(() => {

        if (!currentUser?.uid) {
            return;
        }


        const conversationsQuery =
            query(
                collection(db, "messages"),
                where(
                    "adminId",
                    "==",
                    currentUser.uid
                )
            );


        const unsubscribe =
            onSnapshot(
                conversationsQuery,
                (snapshot) => {

                    const list =
                        snapshot.docs.map(
                            (conversationDoc) => ({
                                id:
                                    conversationDoc.id,
                                ...conversationDoc.data(),
                            })
                        );


                    /* -----------------------------------------
                       Sort in JavaScript.
                       This avoids requiring an additional
                       Firestore composite index.
                    ----------------------------------------- */

                    list.sort(
                        (a, b) => {

                            const timeA =
                                a.timestamp
                                    ?.toMillis?.() ||
                                0;

                            const timeB =
                                b.timestamp
                                    ?.toMillis?.() ||
                                0;

                            return timeB - timeA;
                        }
                    );


                    setConversations(
                        list
                    );


                    /* -----------------------------------------
                       Keep selected conversation updated.
                    ----------------------------------------- */

                    if (
                        selectedChatIdRef.current
                    ) {

                        const updated =
                            list.find(
                                (chat) =>
                                    chat.id ===
                                    selectedChatIdRef.current
                            );

                        if (updated) {

                            setSelectedChat(
                                (previous) => {

                                    if (
                                        JSON.stringify(
                                            previous
                                        ) !==
                                        JSON.stringify(
                                            updated
                                        )
                                    ) {
                                        return updated;
                                    }

                                    return previous;
                                }
                            );
                        }
                    }

                },
                (error) => {

                    console.error(
                        "Conversation listener error:",
                        error
                    );

                }
            );


        return () => unsubscribe();

    }, [currentUser?.uid]);


    /* =====================================================
       OPEN CONVERSATION FROM NOTIFICATION
       -----------------------------------------------------
       Supports both:
       conversationId
       and old studentId notifications.
    ===================================================== */

    useEffect(() => {

        if (!conversations.length) {
            return;
        }


        const requestedConversationId =
            location.state?.conversationId;

        const requestedStudentId =
            location.state?.studentId;


        let requestedConversation = null;


        /* New exact conversation */

        if (requestedConversationId) {

            requestedConversation =
                conversations.find(
                    (conversation) =>
                        conversation.id ===
                        requestedConversationId
                );
        }


        /* Old notification format */

        if (
            !requestedConversation &&
            requestedStudentId
        ) {

            requestedConversation =
                conversations.find(
                    (conversation) =>
                        conversation.studentId ===
                        requestedStudentId ||
                        conversation.userId ===
                        requestedStudentId
                );
        }


        if (!requestedConversation) {
            return;
        }


        setSelectedChat(
            requestedConversation
        );


        navigate(
            "/messages",
            {
                replace: true,
                state: {},
            }
        );

    }, [
        conversations,
        location.state?.conversationId,
        location.state?.studentId,
        navigate,
    ]);


    /* =====================================================
       SELECT CHAT
    ===================================================== */

    const selectAndMarkRead = async (chat) => {

        setSelectedChat(chat);


        if (!chat.unread) {
            return;
        }


        try {

            await updateDoc(
                doc(
                    db,
                    "messages",
                    chat.id
                ),
                {
                    unread: false,
                }
            );

        } catch (error) {

            console.error(
                "Failed to mark read:",
                error
            );
        }
    };


    /* =====================================================
       LISTEN TO CHAT HISTORY
    ===================================================== */

    useEffect(() => {

        if (!selectedChat?.id) {

            setChatHistory([]);
            setActiveUserClaims([]);

            return;
        }


        const repliesQuery =
            query(
                collection(
                    db,
                    "messages",
                    selectedChat.id,
                    "replies"
                ),
                orderBy(
                    "timestamp",
                    "asc"
                )
            );


        const unsubscribeReplies =
            onSnapshot(
                repliesQuery,
                (snapshot) => {

                    setChatHistory(
                        snapshot.docs.map(
                            (messageDoc) => ({
                                id:
                                    messageDoc.id,
                                ...messageDoc.data(),
                            })
                        )
                    );
                }
            );


        /* ---------------------------------------------
           NEW conversation claims
        --------------------------------------------- */

        const claimsRef =
            collection(
                db,
                "messages",
                selectedChat.id,
                "claims"
            );


        const unsubscribeClaims =
            onSnapshot(
                claimsRef,
                (snapshot) => {

                    setActiveUserClaims(
                        snapshot.docs.map(
                            (claimDoc) => ({
                                id:
                                    claimDoc.id,
                                ...claimDoc.data(),
                            })
                        )
                    );
                }
            );


        return () => {

            unsubscribeReplies();
            unsubscribeClaims();

        };

    }, [selectedChat?.id]);


    /* =====================================================
       AUTO SCROLL
    ===================================================== */

    useEffect(() => {

        chatEndRef.current?.scrollIntoView({
            behavior: "smooth",
        });

    }, [
        chatHistory,
        activeUserClaims,
    ]);


    /* =====================================================
       DELETE MESSAGE
    ===================================================== */

    const deleteMessage = async (
        messageId
    ) => {

        if (
            !currentUser ||
            !selectedChat?.id ||
            !messageId
        ) {
            return;
        }


        try {

            await deleteDoc(
                doc(
                    db,
                    "messages",
                    selectedChat.id,
                    "replies",
                    messageId
                )
            );

            hideContextMenu();

        } catch (error) {

            console.error(
                "Delete message error:",
                error
            );
        }
    };


    /* =====================================================
       DELETE CONVERSATION
    ===================================================== */

    const deleteConversation = async (
        conversationId
    ) => {

        if (
            !currentUser ||
            !conversationId
        ) {
            return;
        }


        try {

            const batch =
                writeBatch(db);


            const repliesQuery =
                query(
                    collection(
                        db,
                        "messages",
                        conversationId,
                        "replies"
                    )
                );


            const repliesSnapshot =
                await new Promise(
                    (resolve) => {

                        const unsubscribe =
                            onSnapshot(
                                repliesQuery,
                                (snapshot) => {

                                    unsubscribe();

                                    resolve(
                                        snapshot
                                    );
                                }
                            );
                    }
                );


            repliesSnapshot.docs.forEach(
                (replyDoc) => {

                    batch.delete(
                        doc(
                            db,
                            "messages",
                            conversationId,
                            "replies",
                            replyDoc.id
                        )
                    );
                }
            );


            batch.delete(
                doc(
                    db,
                    "messages",
                    conversationId
                )
            );


            await batch.commit();


            hideContextMenu();


            if (
                selectedChatIdRef.current ===
                conversationId
            ) {

                setSelectedChat(
                    null
                );

                setChatHistory(
                    []
                );

                setActiveUserClaims(
                    []
                );
            }

        } catch (error) {

            console.error(
                "Delete conversation error:",
                error
            );
        }
    };


    /* =====================================================
       CONTEXT MENU
    ===================================================== */

    const showContextMenu = (
        event,
        messageId = null,
        isConversation = false
    ) => {

        event.preventDefault();

        setContextMenu({
            x: event.pageX,
            y: event.pageY,
            messageId,
            isConversation,
        });
    };


    const hideContextMenu = () => {
        setContextMenu(null);
    };


    /* =====================================================
       ADMIN NAME
    ===================================================== */

    const getAdminFullName = () => {

        if (!currentUserProfile) {

            return (
                currentUser?.displayName ||
                "Admin"
            );
        }


        return (
            getFullName(
                currentUserProfile
            ) ||
            currentUser?.displayName ||
            "Admin"
        );
    };


    /* =====================================================
       STUDENT NAME
    ===================================================== */

    const getChatName = (
        chat
    ) => {

        if (!chat) {
            return "";
        }


        const studentId =
            chat.studentId ||
            chat.userId ||
            chat.senderId;


        const liveProfile =
            studentId
                ? userProfilesMap[
                    studentId
                ]
                : null;


        if (liveProfile) {

            return getFullName(
                liveProfile
            );
        }


        return getFullName(
            chat
        );
    };


    /* =====================================================
       STUDENT AVATAR
    ===================================================== */

    const getChatAvatar = (
        chat
    ) => {

        if (!chat) {
            return DEFAULT_ICON;
        }


        const studentId =
            chat.studentId ||
            chat.userId ||
            chat.senderId;


        const liveProfile =
            studentId
                ? userProfilesMap[
                    studentId
                ]
                : null;


        if (
            liveProfile?.photoURL
        ) {

            return liveProfile.photoURL;
        }


        if (
            liveProfile?.avatarUrl
        ) {

            return liveProfile.avatarUrl;
        }


        return (
            chat.avatarUrl ||
            chat.photoURL ||
            DEFAULT_ICON
        );
    };


    /* =====================================================
       ONLINE STATUS
    ===================================================== */

    const getIsUserOnline = (
        chat
    ) => {

        if (!chat) {
            return false;
        }


        const studentId =
            chat.studentId ||
            chat.userId ||
            chat.senderId;


        const liveProfile =
            studentId
                ? userProfilesMap[
                    studentId
                ]
                : null;


        if (
            liveProfile?.isOnline !==
            undefined
        ) {

            return (
                liveProfile.isOnline ===
                true
            );
        }


        return (
            chat.isOnline ===
            true
        );
    };


    /* =====================================================
       CLAIM STATUS
    ===================================================== */

    const handleUpdateClaimStatus = async (
        targetItemId,
        newStatus
    ) => {

        if (
            !selectedChat?.id ||
            !targetItemId
        ) {
            return;
        }


        try {

            /* ---------------------------------------------
               1. Update conversation claim
            --------------------------------------------- */

            const claimDocRef =
                doc(
                    db,
                    "messages",
                    selectedChat.id,
                    "claims",
                    targetItemId
                );


            await setDoc(
                claimDocRef,
                {
                    itemId:
                        targetItemId,

                    status:
                        newStatus,

                    updatedAt:
                        serverTimestamp(),
                },
                {
                    merge: true,
                }
            );


            /* ---------------------------------------------
               2. Update report
            --------------------------------------------- */

            const reportDocRef =
                doc(
                    db,
                    "reports",
                    targetItemId
                );


            const reportSnap =
                await getDoc(
                    reportDocRef
                );


            let itemName =
                "Item";


            if (
                reportSnap.exists()
            ) {

                const reportData =
                    reportSnap.data();


                itemName =
                    reportData?.itemName ||
                    reportData?.title ||
                    "Item";


                const updatedReportStatus =
                    newStatus ===
                    "approved"
                        ? "Approved"
                        : "Unclaimed";


                await updateDoc(
                    reportDocRef,
                    {
                        status:
                            updatedReportStatus,

                        claimedBy:
                            newStatus ===
                            "approved"
                                ? (
                                    selectedChat.studentId ||
                                    selectedChat.userId ||
                                    selectedChat.id
                                )
                                : null,

                        updatedAt:
                            serverTimestamp(),
                    }
                );
            }


            /* ---------------------------------------------
               3. Claim name fallback
            --------------------------------------------- */

            const claimObj =
                activeUserClaims.find(
                    (claim) =>
                        claim.id ===
                            targetItemId ||
                        claim.itemId ===
                            targetItemId
                );


            if (
                claimObj?.itemName
            ) {

                itemName =
                    claimObj.itemName;
            }


            /* ---------------------------------------------
               4. Add response to chat
            --------------------------------------------- */

            await addDoc(
                collection(
                    db,
                    "messages",
                    selectedChat.id,
                    "replies"
                ),
                {
                    itemId:
                        targetItemId,

                    text:
                        `📢 Claim request for "${itemName}" was ${newStatus.toUpperCase()} by Admin.`,

                    sender:
                        "admin",

                    senderId:
                        currentUser.uid,

                    senderName:
                        getAdminFullName(),

                    role:
                        "admin",

                    timestamp:
                        serverTimestamp(),
                }
            );


            /* ---------------------------------------------
               5. Update conversation
            --------------------------------------------- */

            await updateDoc(
                doc(
                    db,
                    "messages",
                    selectedChat.id
                ),
                {
                    message:
                        `Claim request for "${itemName}" set to ${newStatus}`,

                    timestamp:
                        serverTimestamp(),

                    unreadStudent:
                        true,
                }
            );


            /* ---------------------------------------------
               6. Notification
            --------------------------------------------- */

            const recipientUserId =
                selectedChat.studentId ||
                selectedChat.userId ||
                selectedChat.senderId;


            if (recipientUserId) {

                await addDoc(
                    collection(
                        db,
                        "notifications"
                    ),
                    {
                        userId:
                            recipientUserId,

                        studentId:
                            recipientUserId,

                        adminId:
                            currentUser.uid,

                        conversationId:
                            selectedChat.id,

                        itemName:
                            itemName,

                        status:
                            newStatus,

                        isRead:
                            false,

                        timestamp:
                            serverTimestamp(),
                    }
                );
            }

        } catch (error) {

            console.error(
                "Error updating claim status:",
                error
            );

            alert(
                "Failed to update claim status."
            );
        }
    };


    /* =====================================================
       CLOUDINARY
    ===================================================== */

    const uploadToCloudinary = async (
        file
    ) => {

        const formData =
            new FormData();

        formData.append(
            "file",
            file
        );

        formData.append(
            "upload_preset",
            CLOUDINARY_UPLOAD_PRESET
        );


        const response =
            await fetch(
                `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
                {
                    method:
                        "POST",
                    body:
                        formData,
                }
            );


        if (!response.ok) {

            const errorData =
                await response
                    .json()
                    .catch(
                        () => ({})
                    );

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
       SEND ADMIN MESSAGE
    ===================================================== */

    const handleSendMessage = async () => {

        if (
            (!replyText.trim() &&
                !imageFile) ||
            !selectedChat ||
            !currentUser
        ) {
            return;
        }


        try {

            setUploading(true);


            let imageUrl =
                null;


            if (imageFile) {

                imageUrl =
                    await uploadToCloudinary(
                        imageFile
                    );
            }


            const finalSenderName =
                getAdminFullName();


            /* ---------------------------------------------
               ADD REPLY
            --------------------------------------------- */

            await addDoc(
                collection(
                    db,
                    "messages",
                    selectedChat.id,
                    "replies"
                ),
                {
                    text:
                        replyText || "",

                    imageUrl:
                        imageUrl,

                    sender:
                        "admin",

                    senderId:
                        currentUser.uid,

                    senderName:
                        finalSenderName,

                    role:
                        "admin",

                    timestamp:
                        serverTimestamp(),
                }
            );


            /* ---------------------------------------------
               UPDATE CONVERSATION
            --------------------------------------------- */

            await updateDoc(
                doc(
                    db,
                    "messages",
                    selectedChat.id
                ),
                {
                    message:
                        imageUrl
                            ? "📷 Sent an image"
                            : replyText,

                    timestamp:
                        serverTimestamp(),

                    unread:
                        false,

                    unreadStudent:
                        true,
                }
            );


            /* ---------------------------------------------
               RESET
            --------------------------------------------- */

            setReplyText("");

            setImageFile(null);

            if (
                fileInputRef.current
            ) {

                fileInputRef.current.value =
                    "";
            }

        } catch (error) {

            console.error(
                "Error sending reply:",
                error
            );

            alert(
                "Failed to send reply."
            );

        } finally {

            setUploading(false);
        }
    };


    /* =====================================================
       LOADING
    ===================================================== */

    if (loading) {

        return (
            <div className="loading-overlay">

                <div className="spinner"></div>

            </div>
        );
    }


    /* =====================================================
       MAIN UI
    ===================================================== */

    return (

        <div
            className="messages-container"
            onClick={hideContextMenu}
        >

            {/* =================================================
                SIDEBAR
            ================================================= */}

            <div className="messages-sidebar">

                <div className="sidebar-header">

                    <h2>
                        Messages
                    </h2>

                </div>


                <div className="conversation-list">

                    {conversations.length === 0 && (

                        <div
                            style={{
                                padding:
                                    "20px",
                                textAlign:
                                    "center",
                                color:
                                    "#777",
                            }}
                        >
                            No conversations yet.
                        </div>

                    )}


                    {conversations.map(
                        (chat) => {

                            const formattedName =
                                getChatName(
                                    chat
                                );

                            const avatarUrl =
                                getChatAvatar(
                                    chat
                                );

                            const isOnline =
                                getIsUserOnline(
                                    chat
                                );


                            return (

                                <div
                                    key={
                                        chat.id
                                    }
                                    onClick={() =>
                                        selectAndMarkRead(
                                            chat
                                        )
                                    }
                                    onContextMenu={(
                                        e
                                    ) =>
                                        showContextMenu(
                                            e,
                                            chat.id,
                                            true
                                        )
                                    }
                                    className={`convo-item ${
                                        selectedChat?.id ===
                                        chat.id
                                            ? "active"
                                            : ""
                                    }`}
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
                                                avatarUrl
                                            }
                                            alt=""
                                            className="convo-avatar"
                                        />


                                        {isOnline && (

                                            <span
                                                title="Online"
                                                style={{
                                                    position:
                                                        "absolute",
                                                    bottom:
                                                        "2px",
                                                    right:
                                                        "2px",
                                                    width:
                                                        "12px",
                                                    height:
                                                        "12px",
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


                                        {chat.unread && (

                                            <span className="unread-badge"></span>

                                        )}

                                    </div>


                                    <div className="convo-info">

                                        <strong>
                                            {
                                                formattedName
                                            }
                                        </strong>

                                        <p
                                            className="convo-preview"
                                            style={{
                                                color:
                                                    isOnline
                                                        ? "#22c55e"
                                                        : "#888",
                                            }}
                                        >
                                            {isOnline
                                                ? "Online"
                                                : "Offline"}
                                        </p>

                                    </div>

                                </div>

                            );
                        }
                    )}

                </div>

            </div>


            {/* =================================================
                CHAT AREA
            ================================================= */}

            <div className="chat-main-area">

                {selectedChat ? (

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
                                            getChatAvatar(
                                                selectedChat
                                            )
                                        }
                                        alt=""
                                        className="header-avatar"
                                    />


                                    {getIsUserOnline(
                                        selectedChat
                                    ) && (

                                        <span
                                            title="Online"
                                            style={{
                                                position:
                                                    "absolute",
                                                bottom:
                                                    "2px",
                                                right:
                                                    "2px",
                                                width:
                                                    "12px",
                                                height:
                                                    "12px",
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
                                            getChatName(
                                                selectedChat
                                            )
                                        }
                                    </h4>

                                    <span>
                                        {
                                            selectedChat.email ||
                                            userProfilesMap[
                                                selectedChat.studentId
                                            ]?.email ||
                                            "No email provided"
                                        }
                                    </span>

                                </div>

                            </div>

                        </div>


                        {/* =====================================
                            CHAT HISTORY
                        ===================================== */}

                        <div className="chat-history">

                            {chatHistory.map(
                                (msg) => {

                                    const isYourMessage =
                                        msg.role ===
                                            "admin" ||
                                        msg.sender ===
                                            "admin" ||
                                        msg.senderId ===
                                            currentUser.uid;


                                    const isClaimMessage =
                                        msg.itemId ||
                                        msg.isClaimRequest ||
                                        msg.claimId ||
                                        (
                                            msg.text &&
                                            msg.text
                                                .toLowerCase()
                                                .includes(
                                                    "requesting to claim"
                                                )
                                        );


                                    const targetItemId =
                                        msg.itemId ||
                                        msg.claimId;


                                    const matchingClaim =
                                        activeUserClaims.find(
                                            (claim) =>
                                                claim.id ===
                                                    targetItemId ||
                                                claim.itemId ===
                                                    targetItemId
                                        );


                                    return (

                                        <div
                                            key={
                                                msg.id
                                            }
                                            className={`msg-row ${
                                                isYourMessage
                                                    ? "msg-sent"
                                                    : "msg-received"
                                            }`}
                                            onContextMenu={(
                                                e
                                            ) =>
                                                showContextMenu(
                                                    e,
                                                    msg.id
                                                )
                                            }
                                        >

                                            {!isYourMessage && (

                                                <img
                                                    src={
                                                        getChatAvatar(
                                                            selectedChat
                                                        )
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

                                                        <a
                                                            href={
                                                                msg.imageUrl
                                                            }
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >

                                                            <img
                                                                src={
                                                                    msg.imageUrl
                                                                }
                                                                alt=""
                                                                style={{
                                                                    width:
                                                                        "100%",
                                                                    maxHeight:
                                                                        "220px",
                                                                    objectFit:
                                                                        "cover",
                                                                    borderRadius:
                                                                        "12px",
                                                                    display:
                                                                        "block",
                                                                    marginBottom:
                                                                        "10px",
                                                                }}
                                                            />

                                                        </a>

                                                    )}


                                                    {msg.text && (

                                                        <span>
                                                            {
                                                                msg.text
                                                            }
                                                        </span>

                                                    )}


                                                    {/* =================================
                                                        CLAIM BUTTONS
                                                    ================================= */}

                                                    {isClaimMessage &&
                                                        !isYourMessage &&
                                                        targetItemId && (

                                                            <div
                                                                style={{
                                                                    marginTop:
                                                                        "12px",
                                                                    paddingTop:
                                                                        "10px",
                                                                    borderTop:
                                                                        "1px solid rgba(0, 0, 0, 0.08)",
                                                                    display:
                                                                        "flex",
                                                                    gap:
                                                                        "8px",
                                                                    alignItems:
                                                                        "center",
                                                                }}
                                                            >

                                                                {(
                                                                    !matchingClaim ||
                                                                    matchingClaim.status ===
                                                                        "pending"
                                                                ) ? (

                                                                    <>

                                                                        <button
                                                                            onClick={() =>
                                                                                handleUpdateClaimStatus(
                                                                                    targetItemId,
                                                                                    "approved"
                                                                                )
                                                                            }
                                                                            style={{
                                                                                flex:
                                                                                    1,
                                                                                backgroundColor:
                                                                                    "#059669",
                                                                                color:
                                                                                    "#fff",
                                                                                border:
                                                                                    "none",
                                                                                padding:
                                                                                    "8px 12px",
                                                                                borderRadius:
                                                                                    "8px",
                                                                                fontWeight:
                                                                                    "600",
                                                                                cursor:
                                                                                    "pointer",
                                                                                fontSize:
                                                                                    "12px",
                                                                            }}
                                                                        >
                                                                            Approve Claim
                                                                        </button>


                                                                        <button
                                                                            onClick={() =>
                                                                                handleUpdateClaimStatus(
                                                                                    targetItemId,
                                                                                    "rejected"
                                                                                )
                                                                            }
                                                                            style={{
                                                                                flex:
                                                                                    1,
                                                                                backgroundColor:
                                                                                    "#d32f2f",
                                                                                color:
                                                                                    "#fff",
                                                                                border:
                                                                                    "none",
                                                                                padding:
                                                                                    "8px 12px",
                                                                                borderRadius:
                                                                                    "8px",
                                                                                fontWeight:
                                                                                    "600",
                                                                                cursor:
                                                                                    "pointer",
                                                                                fontSize:
                                                                                    "12px",
                                                                            }}
                                                                        >
                                                                            Reject Claim
                                                                        </button>

                                                                    </>

                                                                ) : (

                                                                    <div
                                                                        style={{
                                                                            width:
                                                                                "100%",
                                                                            textAlign:
                                                                                "center",
                                                                            padding:
                                                                                "6px 12px",
                                                                            borderRadius:
                                                                                "6px",
                                                                            fontSize:
                                                                                "12px",
                                                                            fontWeight:
                                                                                "700",
                                                                            backgroundColor:
                                                                                matchingClaim.status ===
                                                                                "approved"
                                                                                    ? "#d1fae5"
                                                                                    : "#fee2e2",
                                                                            color:
                                                                                matchingClaim.status ===
                                                                                "approved"
                                                                                    ? "#065f46"
                                                                                    : "#991b1b",
                                                                        }}
                                                                    >

                                                                        {matchingClaim.status ===
                                                                        "approved"
                                                                            ? "✓ Claim Approved"
                                                                            : "✕ Claim Rejected"}

                                                                    </div>

                                                                )}

                                                            </div>

                                                        )}

                                                </div>


                                                <span className="msg-time">

                                                    {
                                                        formatDateTime(
                                                            msg.timestamp
                                                        )
                                                    }


                                                    {isYourMessage && (

                                                        <span className="sender-tag">

                                                            You

                                                        </span>

                                                    )}

                                                </span>

                                            </div>

                                        </div>

                                    );
                                }
                            )}


                            <div
                                ref={
                                    chatEndRef
                                }
                            />

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
                                            "rgba(255, 255, 255, 0.6)",
                                        gap:
                                            "10px",
                                        borderRadius:
                                            "8px",
                                        marginBottom:
                                            "8px",
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
                                                "#d32f2f",
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

                                <div className="input-with-sender">

                                    <label
                                        htmlFor="admin-file-upload"
                                        className="attachment-btn"
                                        style={{
                                            cursor:
                                                "pointer",
                                        }}
                                    >
                                        📎
                                    </label>


                                    <input
                                        id="admin-file-upload"
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
                                            replyText
                                        }
                                        onChange={(e) =>
                                            setReplyText(
                                                e.target.value
                                            )
                                        }
                                        disabled={
                                            uploading
                                        }
                                        onKeyDown={(e) => {

                                            if (
                                                e.key ===
                                                    "Enter" &&
                                                !e.shiftKey
                                            ) {

                                                e.preventDefault();

                                                handleSendMessage();
                                            }

                                        }}
                                    />


                                    <span className="sender-tag-right">

                                        Admin

                                    </span>

                                </div>

                            </div>

                        </div>

                    </>

                ) : (

                    <div className="empty-chat-state">

                        <p>
                            Select a message to view details
                        </p>

                    </div>

                )}

            </div>


            {/* =================================================
                CONTEXT MENU
            ================================================= */}

            {contextMenu && (

                <div
                    className="context-menu"
                    style={{
                        top:
                            contextMenu.y,
                        left:
                            contextMenu.x,
                        position:
                            "absolute",
                        zIndex:
                            1000,
                        background:
                            "#fff",
                        border:
                            "1px solid #ccc",
                        borderRadius:
                            "8px",
                        boxShadow:
                            "0 4px 12px rgba(0,0,0,0.15)",
                    }}
                >

                    {contextMenu.isConversation ? (

                        <button
                            style={{
                                background:
                                    "none",
                                border:
                                    "none",
                                padding:
                                    "8px 12px",
                                width:
                                    "100%",
                                textAlign:
                                    "left",
                                cursor:
                                    "pointer",
                                fontSize:
                                    "12px",
                                color:
                                    "#d32f2f",
                            }}
                            onClick={() =>
                                deleteConversation(
                                    contextMenu.messageId
                                )
                            }
                        >
                            Delete Conversation
                        </button>

                    ) : (

                        <button
                            style={{
                                background:
                                    "none",
                                border:
                                    "none",
                                padding:
                                    "8px 12px",
                                width:
                                    "100%",
                                textAlign:
                                    "left",
                                cursor:
                                    "pointer",
                                fontSize:
                                    "12px",
                                color:
                                    "#d32f2f",
                            }}
                            onClick={() =>
                                deleteMessage(
                                    contextMenu.messageId
                                )
                            }
                        >
                            Delete Message
                        </button>

                    )}

                </div>

            )}

        </div>
    );
}


export default Messages;