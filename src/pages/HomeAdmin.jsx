import {
    collection,
    deleteDoc,
    doc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    updateDoc
} from "firebase/firestore";
import { useEffect, useState } from 'react';
import { db } from '../firebase';

const CATEGORIES = [
    "Personal Valuables",
    "Electronics",
    "Keys & Accessories",
    "Sports Equipment",
    "Containers & Bottles",
    "Documents & IDs",
    "Bags & Luggage",
    "Apparel & Accessories",
    "General Items"
];

function HomeAdmin() {
    const [reports, setReports] = useState([]);
    const [selectedImg, setSelectedImg] = useState(null);
    
    const [editingReport, setEditingReport] = useState(null);
    const [editFormData, setEditFormData] = useState({
        itemName: '',
        category: '',
        locationName: '',
        landmark: '',
        description: '',
        status: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const q = query(collection(db, "reports"), orderBy("timestamp", "desc"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const reportsArr = [];
            querySnapshot.forEach((docSnap) => {
                reportsArr.push({ ...docSnap.data(), id: docSnap.id });
            });
            setReports(reportsArr);
        });
        return () => unsubscribe();
    }, []);

    const handleOpenEditModal = (report) => {
        setEditingReport(report);
        setEditFormData({
            itemName: report.itemName || '',
            category: report.category || 'General Items',
            locationName: report.locationName || '',
            landmark: report.landmark || '',
            description: report.description || '',
            status: report.status || 'Lost'
        });
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        if (!editingReport) return;

        setIsSaving(true);
        try {
            const newStatus = editFormData.status;
            const reportRef = doc(db, "reports", editingReport.id);

            // 1. Update main report document status
            await updateDoc(reportRef, {
                itemName: editFormData.itemName,
                category: editFormData.category,
                locationName: editFormData.locationName,
                landmark: editFormData.landmark,
                description: editFormData.description,
                status: newStatus
            });

            // 2. If marked as Unclaimed, Lost, or Found, wipe all student claim approvals for this item across user subcollections safely
            const isUnclaimedState = 
                newStatus.toLowerCase() === "unclaimed" || 
                newStatus.toLowerCase() === "lost" || 
                newStatus.toLowerCase() === "found";

            if (isUnclaimedState) {
                try {
                    const usersSnap = await getDocs(collection(db, "users"));
                    const deletePromises = [];

                    usersSnap.docs.forEach((userDoc) => {
                        const claimRef = doc(db, "messages", userDoc.id, "claims", editingReport.id);
                        deletePromises.push(deleteDoc(claimRef).catch(() => {}));
                    });

                    if (editingReport.claimedBy) {
                        const directClaimRef = doc(db, "messages", editingReport.claimedBy, "claims", editingReport.id);
                        deletePromises.push(deleteDoc(directClaimRef).catch(() => {}));
                    }

                    await Promise.all(deletePromises);
                } catch (cleanErr) {
                    console.warn("Could not sweep existing claims, but report was saved:", cleanErr);
                }
            }

            alert(`Report updated to "${newStatus}"! ${isUnclaimedState ? "Item is now restored to Active Reports." : ""}`);
            setEditingReport(null);
        } catch (error) {
            console.error("Error updating report:", error);
            alert("Failed to update report: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="home-admin-container">
            {selectedImg && (
                <div className="image-modal-overlay" onClick={() => setSelectedImg(null)}>
                    <div className="modal-content">
                        <span className="close-modal" onClick={() => setSelectedImg(null)}>&times;</span>
                        <img src={selectedImg} alt="Full size" />
                    </div>
                </div>
            )}

            {editingReport && (
                <div className="edit-modal-overlay" onClick={() => setEditingReport(null)}>
                    <div className="edit-modal-box" onClick={(e) => e.stopPropagation()}>
                        <button className="close-edit-btn" onClick={() => setEditingReport(null)}>&times;</button>
                        <h2 className="edit-modal-title">Edit Report</h2>
                        
                        <form onSubmit={handleSaveEdit} className="edit-modal-form">
                            <div className="edit-input-group">
                                <label>Item Name</label>
                                <input 
                                    type="text" 
                                    value={editFormData.itemName} 
                                    onChange={(e) => setEditFormData({...editFormData, itemName: e.target.value})} 
                                    required 
                                />
                            </div>

                            <div className="edit-input-group">
                                <label>Category</label>
                                <select 
                                    value={editFormData.category} 
                                    onChange={(e) => setEditFormData({...editFormData, category: e.target.value})}
                                >
                                    {CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="edit-input-group">
                                <label>Location</label>
                                <input 
                                    type="text" 
                                    value={editFormData.locationName || editFormData.landmark} 
                                    onChange={(e) => setEditFormData({
                                        ...editFormData, 
                                        locationName: e.target.value,
                                        landmark: e.target.value
                                    })} 
                                    required 
                                />
                            </div>

                            <div className="edit-input-group">
                                <label>Description</label>
                                <textarea 
                                    rows="3" 
                                    value={editFormData.description} 
                                    onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                                ></textarea>
                            </div>

                            <div className="edit-input-group">
                                <label>Status</label>
                                <select 
                                    value={editFormData.status} 
                                    onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
                                >
                                    <option value="Lost">Lost</option>
                                    <option value="Found">Found</option>
                                    <option value="Unclaimed">Unclaimed</option>
                                    <option value="Claimed">Claimed</option>
                                </select>
                            </div>

                            <div className="edit-modal-actions">
                                <button 
                                    type="button" 
                                    className="edit-cancel-btn"
                                    onClick={() => setEditingReport(null)}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="edit-save-btn"
                                    disabled={isSaving}
                                >
                                    {isSaving ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <main className="admin-main-content w-100">
                <header className="content-header">
                    <h1>Recent Reports</h1>
                </header>

                <div className="dashboard-widgets" style={{ width: '100%', maxWidth: '1200px', display: 'flex', justifyContent: 'center' }}>
                    {reports.length === 0 ? (
                        <div className="empty-state-card" style={{ textAlign: 'center', width: '100%', padding: '40px 0' }}>
                            <p style={{ margin: 0, textAlign: 'center', fontSize: '1.1rem', color: '#062438' }}>No active reports found.</p>
                        </div>
                    ) : (
                        <div className="reports-grid">
                            {reports.map((report) => {
                                const locationDisplay = report.locationName || report.landmark || 'Not specified';
                                const categoryDisplay = report.category || 'General Items';

                                return (
                                    <div key={report.id} className="report-card">
                                        {report.imageUrl && (
                                            <div 
                                                className="report-image-container" 
                                                onClick={() => setSelectedImg(report.imageUrl)} 
                                                style={{ cursor: 'zoom-in' }}
                                            >
                                                <img src={report.imageUrl} alt={report.itemName} className="report-img-preview" />
                                            </div>
                                        )}
                                        
                                        <div className="report-details">
                                            <h3 className="card-item-title">
                                                <strong>Item name:</strong> {report.itemName}
                                            </h3>
                                            <p className="card-info-text">
                                                <strong>Category:</strong> {categoryDisplay}
                                            </p>
                                            <p className="card-info-text">
                                                <strong>Location:</strong> {locationDisplay}
                                            </p>
                                            <div className="card-description-box">
                                                <strong>Description:</strong>
                                                <p>{report.description || 'No description provided.'}</p>
                                            </div>

                                            <div className="card-actions-row">
                                                <span className={`status-badge status-pill status-${report.status ? report.status.toLowerCase() : ''}`}>
                                                    STATUS: {report.status ? report.status.toUpperCase() : 'UNKNOWN'}
                                                </span>
                                                <button 
                                                    className="action-btn claim-btn"
                                                    onClick={() => handleOpenEditModal(report)}
                                                >
                                                    Edit Report
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default HomeAdmin;