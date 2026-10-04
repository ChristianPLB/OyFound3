import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from 'react';
import '../css/AIMatches.css';
import { db } from '../firebase';

function AIMatches() {
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "reports"), orderBy("timestamp", "desc"));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            const lostItems = allItems.filter(item => item.status?.toLowerCase() === 'lost');
            const foundItems = allItems.filter(item => item.status?.toLowerCase() === 'found');

            const potentialMatches = [];

            lostItems.forEach(lost => {
                foundItems.forEach(found => {
                    if (!lost.itemName || !found.itemName) return;

                    const lostName = lost.itemName.toLowerCase().trim();
                    const foundName = found.itemName.toLowerCase().trim();

                    const isMatch = lostName.length > 2 && (lostName.includes(foundName) || foundName.includes(lostName));
                    
                    if (isMatch) {
                        potentialMatches.push({
                            id: `${lost.id}-${found.id}`,
                            lost,
                            found,
                            score: "High Confidence"
                        });
                    }
                });
            });

            setMatches(potentialMatches);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <div className="home-admin-container">

            <main className="admin-main-content">
                <header className="content-header">
                    <h1>AI Suggested Matches</h1>
                    <p>Scanning {matches.length} potential pairs...</p>
                </header>

                <div className="matches-grid">
                    {matches.length === 0 ? (
                        <div className="empty-state-card"><p>No matches found yet.</p></div>
                    ) : (
                        matches.map((match) => (
                            <div key={match.id} className="match-comparison-card">
                                {/* --- LOST SIDE --- */}
                                <div className="match-side lost-side">
                                    <span className="badge">LOST</span>
                                    {match.lost.imageUrl && (
                                        <div className="match-img-wrapper">
                                            <img src={match.lost.imageUrl} alt="Lost Item" />
                                        </div>
                                    )}
                                    <h4>{match.lost.itemName}</h4>
                                    <p className="landmark-text">{match.lost.landmark}</p>
                                </div>
                                
                                <div className="match-vs">
                                    <div className="match-score">{match.score}</div>
                                    <div className="vs-line"></div>
                                </div>

                                {/* --- FOUND SIDE --- */}
                                <div className="match-side found-side">
                                    <span className="badge">FOUND</span>
                                    {match.found.imageUrl && (
                                        <div className="match-img-wrapper">
                                            <img src={match.found.imageUrl} alt="Found Item" />
                                        </div>
                                    )}
                                    <h4>{match.found.itemName}</h4>
                                    <p className="landmark-text">{match.found.landmark}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
}

export default AIMatches;