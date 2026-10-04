import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from 'react';
import { db } from '../firebase';

function HomeGuest() {
    const [activeCategory, setActiveCategory] = useState('All');
    const [reports, setReports] = useState([]);

    // Fetch reports from localStorage (where Admin saves them)
    useEffect(() => {
        const savedReports = JSON.parse(localStorage.getItem('adminReports') || '[]');
        setReports(savedReports);

        const q = query(collection(db, "reports"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const items = [];
        querySnapshot.forEach((doc) => {
            items.push({ id: doc.id, ...doc.data() });
        });
        setReports(items);
    });
    return () => unsubscribe();
    }, []);

    // Filter reports based on the selected category
    const filteredReports = reports.filter(item => 
        activeCategory === 'All' || item.status === activeCategory
    );

    return (
        <div className="student-home">
            {/* Category Header */}
            <div className="category-header">
                <button 
                    className={activeCategory === 'Lost' ? 'active' : ''} 
                    onClick={() => setActiveCategory('Lost')}
                >Lost</button>
                <div className="divider">|</div>
                <button 
                    className={activeCategory === 'Found' ? 'active' : ''} 
                    onClick={() => setActiveCategory('Found')}
                >Found</button>
                <div className="divider">|</div>
                <button 
                    className={activeCategory === 'All' ? 'active' : ''} 
                    onClick={() => setActiveCategory('All')}
                >All</button>
            </div>

            <div className="reports-grid">
                {filteredReports.length > 0 ? (
                    filteredReports.map((report, index) => (
                        <div className="card item-card" key={index}>
                            {/* Map Preview Area */}
                            <div className="ratio ratio-1x1 map-container">
                                <iframe
                                    src={`https://maps.google.com/maps?q=${report.landmark}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                                    style={{ border: 0 }}
                                    allowFullScreen=""
                                    loading="lazy"
                                    title={`map-${index}`}
                                ></iframe>
                            </div>

                            <div className="card-body">
                                <div className="card-badge" data-status={report.status}>
                                    {report.status}
                                </div>
                                <h5 className="card-title">{report.itemName}</h5>
                                <p className="card-text">
                                    <strong>Location:</strong> {report.landmark}<br/>
                                    <strong>Date:</strong> {report.date}
                                </p>
                                <p className="description-preview">{report.description}</p>
                                <a 
                                    href={`https://www.google.com/maps/search/?api=1&query=${report.landmark}`} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="btn btn-primary w-100"
                                >
                                    Open in Google Maps
                                </a>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="no-reports">
                        <p>No {activeCategory} items reported yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default HomeGuest;