import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from 'react';
import { db } from '../firebase';

function StudentDashBoard() {
    const [activeTab, setActiveTab] = useState('Lost'); // Only 'Lost' or 'Found'
    const [searchTerm, setSearchTerm] = useState('');
    const [reports, setReports] = useState([]);

    useEffect(() => {
        // We only listen to the active reports collection
        const qActive = query(collection(db, "reports"), orderBy("timestamp", "desc"));
        const unsubActive = onSnapshot(qActive, (snap) => {
            setReports(snap.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        });

        return () => unsubActive();
    }, []);

    // --- Helper for Counts (Lost/Found only) ---
    const getCount = (type) => {
        return reports.filter(r => r.status === type).length;
    };

    // --- Search Filter ---
    const filteredItems = reports
        .filter(r => r.status === activeTab)
        .filter(item => 
            item.itemName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.landmark?.toLowerCase().includes(searchTerm.toLowerCase())
        );

    return (
        <div className="dashboard-wrapper" style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>Lost & Found Gallery</h2>
                
                {/* Search Bar */}
                <input 
                    type="text" 
                    placeholder="Search for an item..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc', width: '300px' }}
                />
            </div>

            {/* Student Navigation (No "Claimed" tab) */}
            <div style={{ display: 'flex', gap: '15px', marginBottom: '30px', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
                {['Lost', 'Found'].map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: '10px 20px',
                            cursor: 'pointer',
                            border: 'none',
                            background: activeTab === tab ? '#007bff' : 'transparent',
                            color: activeTab === tab ? '#fff' : '#555',
                            borderRadius: '5px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        {tab}
                        <span style={{ 
                            backgroundColor: activeTab === tab ? 'rgba(255,255,255,0.3)' : '#eee', 
                            padding: '2px 8px', 
                            borderRadius: '10px', 
                            fontSize: '12px' 
                        }}>
                            {getCount(tab)}
                        </span>
                    </button>
                ))}
            </div>

            {/* Content Grid (No "Claimed" button) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {filteredItems.map(item => (
                    <div key={item.id} style={{ border: '1px solid #ddd', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        <img src={item.imageUrl || 'https://via.placeholder.com/150'} alt="" style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
                        <div style={{ padding: '15px' }}>
                            <h3 style={{ margin: '0 0 10px 0' }}>{item.itemName}</h3>
                            <p style={{ color: '#666', fontSize: '14px' }}>📍 {item.landmark}</p>
                            <p style={{ color: '#888', fontSize: '13px', fontStyle: 'italic' }}>Date: {item.date}</p>
                        </div>
                    </div>
                ))}
            </div>
            
            {filteredItems.length === 0 && (
                <div style={{ textAlign: 'center', marginTop: '50px', color: '#999' }}>
                    <p>No items found in this category.</p>
                </div>
            )}
        </div>
    );
}

export default StudentDashBoard;