import { 
    addDoc, 
    collection, 
    deleteDoc, 
    doc, 
    getDoc, 
    getDocs, 
    onSnapshot, 
    orderBy, 
    query, 
    serverTimestamp, 
    setDoc, 
    where 
} from "firebase/firestore";
import { useEffect, useState } from 'react';
import Oybot from '../components/Oybot.jsx';
import { auth, db } from '../firebase';

const autoIdentifyCategory = (itemName, dbCategory) => {
    if (dbCategory && dbCategory.trim() !== "") {
        return dbCategory;
    }

    if (!itemName) return "Uncategorized";

    const name = itemName.toLowerCase().trim();

    if (name.includes("key") || name.includes("fob") || name.includes("lanyard")) return "Keys & Accessories";
    if (name.includes("pickleball") || name.includes("racket") || name.includes("ball") || name.includes("bat") || name.includes("glove")) return "Sports Equipment";
    if (name.includes("wallet") || name.includes("purse") || name.includes("pouch") || name.includes("card holder") || name.includes("cash")) return "Personal Valuables";
    if (name.includes("headphone") || name.includes("earphone") || name.includes("airpods") || name.includes("charger") || name.includes("phone") || name.includes("laptop")) return "Electronics";
    if (name.includes("tumbler") || name.includes("bottle") || name.includes("flask") || name.includes("mug") || name.includes("cup")) return "Containers & Bottles";
    if (name.includes("id") || name.includes("license") || name.includes("card") || name.includes("document") || name.includes("paper")) return "Documents & IDs";
    if (name.includes("bag") || name.includes("backpack") || name.includes("tote") || name.includes("handbag")) return "Bags & Luggage";
    if (name.includes("jacket") || name.includes("hoodie") || name.includes("shirt") || name.includes("cap") || name.includes("umbrella")) return "Apparel & Accessories";

    return "General Items";
};

function HomeStudent({ searchQuery }) {
    const [activeTab, setActiveTab] = useState('All');
    const [reports, setReports] = useState([]);
    const [userClaims, setUserClaims] = useState({});
    const [loadingItemId, setLoadingItemId] = useState(null);

    // =========================================================
    // REAL-TIME REPORTS LISTENER
    // =========================================================
    useEffect(() => {
        const qActive = query(collection(db, "reports"), orderBy("timestamp", "desc"));
        const unsub = onSnapshot(qActive, (snap) => {
            setReports(snap.docs.map(docSnap => ({ ...docSnap.data(), id: docSnap.id })));
        });
        return () => unsub();
    }, []);

    // =========================================================
    // REAL-TIME USER CLAIMS LISTENER
    // =========================================================
    useEffect(() => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const claimsRef = collection(db, "messages", currentUser.uid, "claims");
        const unsubClaims = onSnapshot(claimsRef, (snap) => {
            const claimsMap = {};
            snap.docs.forEach(docSnap => {
                claimsMap[docSnap.id] = docSnap.data(); 
            });
            setUserClaims(claimsMap);
        });

        return () => unsubClaims();
    }, []);

    // =========================================================
    // CLAIM TOGGLE (SUBMIT / CANCEL CLAIM)
    // =========================================================
    const handleToggleClaim = async (e, item, category) => {
        e.stopPropagation(); 
        
        const currentUser = auth.currentUser;
        if (!currentUser) {
            alert("You must be logged in to claim or cancel a claim for an item.");
            return;
        }

        if (loadingItemId) return;
        setLoadingItemId(item.id);

        const currentClaim = userClaims[item.id];
        const hasClaim = !!currentClaim;
        const claimDocRef = doc(db, "messages", currentUser.uid, "claims", item.id);
        
        try {
            if (hasClaim) {
                // 1. Delete claim document for this item
                await deleteDoc(claimDocRef);

                // 2. Delete replies tied to this item
                const repliesRef = collection(db, "messages", currentUser.uid, "replies");
                const qReplies = query(repliesRef, where("itemId", "==", item.id));
                const replySnap = await getDocs(qReplies);
                
                const deletePromises = replySnap.docs.map(docSnap => deleteDoc(docSnap.ref));
                await Promise.all(deletePromises);

                // 3. Clean up parent message document if no claims remain
                const remainingClaimsSnap = await getDocs(collection(db, "messages", currentUser.uid, "claims"));
                if (remainingClaimsSnap.empty) {
                    await deleteDoc(doc(db, "messages", currentUser.uid));
                } else {
                    const lastClaim = remainingClaimsSnap.docs[0].data();
                    await setDoc(doc(db, "messages", currentUser.uid), {
                        message: `📢 CLAIM REQUEST: "${lastClaim.itemName}" (${lastClaim.status || 'Pending Approval'})`,
                        timestamp: serverTimestamp()
                    }, { merge: true });
                }

                alert(`Claim request for "${item.itemName}" was cancelled.`);
            } else {
                let activeFirstName = "";
                let activeLastName = "";
                const activeEmail = currentUser.email || "";

                const userDocRef = doc(db, "users", currentUser.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    activeFirstName = userData.firstName || userData.firstname || "";
                    activeLastName = userData.lastName || userData.lastname || "";
                }

                if (!activeFirstName && !activeLastName && currentUser.displayName) {
                    const nameParts = currentUser.displayName.split(" ");
                    activeFirstName = nameParts[0] || "";
                    activeLastName = nameParts.slice(1).join(" ") || "";
                }

                const finalStudentName = `${activeFirstName} ${activeLastName}`.trim() || activeEmail.split('@')[0] || "Student User";

                const conversationDocRef = doc(db, "messages", currentUser.uid);
                await setDoc(conversationDocRef, {
                    firstName: activeFirstName,
                    lastName: activeLastName,
                    fullName: finalStudentName,
                    email: activeEmail,
                    avatarUrl: currentUser.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
                    message: `📢 CLAIM REQUEST: "${item.itemName}" (Pending Approval)`,
                    timestamp: serverTimestamp(),
                    unread: true
                }, { merge: true });

                await setDoc(claimDocRef, {
                    itemId: item.id,
                    itemName: item.itemName,
                    itemCategory: category || "",
                    studentId: currentUser.uid,
                    studentEmail: activeEmail,
                    studentName: finalStudentName,
                    status: "pending",
                    timestamp: serverTimestamp()
                });

                await addDoc(collection(db, "messages", currentUser.uid, "replies"), {
                    itemId: item.id,
                    text: `Hello Admin, I am requesting to claim the item "${item.itemName}" found at "${item.locationName || item.landmark || 'Not specified'}". Please review and verify my claim request.`,
                    imageUrl: item.imageUrl || null, 
                    sender: "student",
                    senderId: currentUser.uid, 
                    senderName: finalStudentName,
                    role: 'student',
                    timestamp: serverTimestamp()
                });
                
                alert(`Claim request for "${item.itemName}" has been submitted! Waiting for Admin approval.`);
            }
        } catch (error) {
            console.error("Error toggling claim request:", error);
            alert("Failed to update claim state.");
        } finally {
            setLoadingItemId(null);
        }
    };

    // =========================================================
    // FILTERING LOGIC
    // =========================================================
    const filteredItems = reports.filter(item => {
        const itemStatus = (item.status || "").toLowerCase();
        const tabLower = activeTab.toLowerCase();
        
        let matchesTab = false;
        if (activeTab === 'All') {
            matchesTab = true;
        } else if (tabLower === 'lost') {
            matchesTab = itemStatus === 'lost' || itemStatus === 'unclaimed';
        } else if (tabLower === 'found') {
            matchesTab = itemStatus === 'found' || itemStatus === 'unclaimed';
        } else {
            matchesTab = itemStatus === tabLower;
        }
        
        const queryClean = (searchQuery || "").toLowerCase().trim();
        const nameToSearch = (item.itemName || "").toLowerCase();
        const descToSearch = (item.description || "").toLowerCase();
        const locationToSearch = (item.locationName || item.landmark || "").toLowerCase();
        const categoryToSearch = autoIdentifyCategory(item.itemName, item.category).toLowerCase();

        const matchesSearch = queryClean === "" || 
            nameToSearch.includes(queryClean) || 
            descToSearch.includes(queryClean) || 
            locationToSearch.includes(queryClean) ||
            categoryToSearch.includes(queryClean);

        return matchesTab && matchesSearch;
    });

    const isItemActive = (item) => {
        const itemStatus = (item.status || "").toLowerCase();
        return itemStatus === "lost" || itemStatus === "found" || itemStatus === "unclaimed";
    };

    const renderClaimButtonText = (item, claimData) => {
        const itemStatus = (item.status || "").toLowerCase();

        if (claimData?.status === "approved" || itemStatus === "claimed" || itemStatus === "approved") {
            return "Claim Approved ✓";
        }

        if (claimData?.status === "pending") {
            return "Pending Admin";
        }

        if (claimData?.status === "rejected") {
            return "Claim Rejected";
        }

        return "Claim Item";
    };

    return (
        <div className="student-home">
            <div className="category-header">
                <button className={activeTab === 'Lost' ? 'active' : ''} onClick={() => setActiveTab('Lost')}>Lost</button>
                <button className={activeTab === 'Found' ? 'active' : ''} onClick={() => setActiveTab('Found')}>Found</button>
                <button className={activeTab === 'All' ? 'active' : ''} onClick={() => setActiveTab('All')}>All</button>
            </div>

            <div className="dashboard-widgets">
                {filteredItems.length === 0 ? (
                    <div className="empty-state-card">
                        <p>No item reports found here.</p>
                    </div>
                ) : (
                    <div className="reports-grid">
                        {filteredItems.map(item => {
                            const identifiedCategory = autoIdentifyCategory(item.itemName, item.category);
                            const claimData = userClaims[item.id];
                            const itemStatus = (item.status || "").toLowerCase();
                            
                            const isApprovedOrClaimed = itemStatus === "claimed" || itemStatus === "approved" || claimData?.status === "approved";
                            const isPending = claimData?.status === "pending";
                            const locationDisplay = item.locationName || item.landmark || 'Not specified';

                            return (
                                <div key={item.id} className="student-card-container">
                                    <div className="student-card-left">
                                        <img 
                                            src={item.imageUrl || 'https://via.placeholder.com/350x250'} 
                                            alt={item.itemName} 
                                            className="student-card-image"
                                        />
                                    </div>
                                    <div className="student-card-right">
                                        <h3 className="card-item-title">
                                            Item name: {item.itemName}
                                        </h3>
                                        <p className="card-info-text">
                                            <strong>Category:</strong> {identifiedCategory}
                                        </p>
                                        <p className="card-info-text">
                                            <strong>Location:</strong> {locationDisplay}
                                        </p>
                                        <div className="card-description-box">
                                            <strong>Description:</strong>
                                            <p>{item.description || 'No description provided.'}</p>
                                        </div>
                                        <div className="card-actions-row">
                                            <span className={`status-pill status-${itemStatus}`}>
                                                STATUS: {(item.status || "UNCLAIMED").toUpperCase()}
                                            </span>
                                            <button 
                                                className={`claim-btn ${
                                                    isPending 
                                                        ? 'pending' 
                                                        : isApprovedOrClaimed 
                                                        ? 'claimed' 
                                                        : ''
                                                }`}
                                                onClick={(e) => handleToggleClaim(e, item, identifiedCategory)}
                                                disabled={loadingItemId === item.id || (isApprovedOrClaimed && !isPending)}
                                            >
                                                {loadingItemId === item.id 
                                                    ? "Processing..." 
                                                    : renderClaimButtonText(item, claimData)
                                                }
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* DRAGGABLE OYBOT FOR STUDENT VIEW */}
            <Oybot />
        </div>
    );
}

export default HomeStudent;