import { addDoc, collection } from "firebase/firestore";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const TOLEDO_BOUNDS = [[10.2500, 123.5000], [10.5000, 123.8000]];

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

function ReportItem() {
    const navigate = useNavigate();
    const [itemStatus, setItemStatus] = useState('Lost');
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [location, setLocation] = useState(null); 

    const [formData, setFormData] = useState({
        itemName: '',
        category: 'Personal Valuables',
        locationName: '',
        landmark: '',
        date: '',
        time: '',
        description: ''
    });

    const fileInputRef = useRef(null);

    const uploadImageToCloudinary = async (file) => {
        const apiKey = "396127833722297"; 
        const cloudName = "dvfykqznw";
        const uploadPreset = "Oyfound"; 

        const body = new FormData();
        body.append("file", file);
        body.append("upload_preset", uploadPreset);
        body.append("api_key", apiKey);

        try {
            const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                method: "POST",
                body: body,
            });

            const result = await response.json();

            if (response.ok) {
                return result.secure_url; 
            } else {
                console.error("Cloudinary Error:", result.error);
                throw new Error(result.error.message || "Cloudinary Upload Failed");
            }
        } catch (error) {
            throw new Error(error.message || "Connection to Cloudinary failed.");
        }
    };

    function LocationMarker() {
        useMapEvents({
            click(e) {
                setLocation(e.latlng);
                if (itemStatus !== 'Lost') {
                    setFormData(prev => ({ 
                        ...prev, 
                        landmark: `Toledo: ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}` 
                    }));
                }
            },
        });
        return location === null ? null : <Marker position={location}></Marker>;
    }

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleFileChange = (e) => {
        if (e.target.files[0]) setSelectedFile(e.target.files[0]);
    };

    const handleStatusChange = (status) => {
        setItemStatus(status);
        if (status === 'Lost') {
            setFormData(prev => ({ ...prev, landmark: '' }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!location) {
            alert("Please pin the location on the map!");
            return;
        }

        setIsUploading(true); 
        
        try {
            let imageUrl = "";

            if (selectedFile) {
                imageUrl = await uploadImageToCloudinary(selectedFile);
            }

            await addDoc(collection(db, "reports"), {
                ...formData,
                status: itemStatus,
                imageUrl: imageUrl,
                location: { lat: location.lat, lng: location.lng },
                timestamp: new Date()
            });

            alert("Report Published successfully!");
            navigate('/admin');

        } catch (error) {
            console.error("Submission Error:", error);
            alert(`Error: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="report-page-container"> 
            <div className="report-item-box">
                <h2 className="form-title">Submit a Report</h2>
                
                <div className="report-item-wrapper">
                    <form className={`report-item-form ${isUploading ? 'form-faded' : ''}`} onSubmit={handleSubmit}>
                        
                        {isUploading && (
                            <div className="loading-overlay">
                                <div className="spinner"></div>
                                <p>Uploading report to OyFound...</p>
                            </div>
                        )}

                        <div className="form-section-text">
                            <div className="input-block">
                                <label>Item Name</label>
                                <input 
                                    type="text" 
                                    id="itemName" 
                                    value={formData.itemName} 
                                    onChange={handleInputChange} 
                                    required 
                                    disabled={isUploading}
                                />
                            </div>

                            <div className="input-block">
                                <label>Category</label>
                                <select 
                                    id="category" 
                                    value={formData.category} 
                                    onChange={handleInputChange} 
                                    disabled={isUploading}
                                >
                                    {CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="input-block">
                                <label>Location</label>
                                <input 
                                    type="text" 
                                    id="locationName" 
                                    placeholder="e.g. 2nd floor building near Senior High Comlab"
                                    value={formData.locationName} 
                                    onChange={handleInputChange} 
                                    required 
                                    disabled={isUploading}
                                />
                            </div>
                            
                            {itemStatus !== 'Lost' && (
                                <div className="input-block">
                                    <label>Landmark</label>
                                    <input 
                                        type="text" 
                                        id="landmark" 
                                        value={formData.landmark} 
                                        onChange={handleInputChange} 
                                        required={itemStatus !== 'Lost'} 
                                        disabled={isUploading}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="map-locator-container" style={{ height: '350px', marginBottom: '20px', position: 'relative'}}>
                            <MapContainer center={[10.3776, 123.6358]} zoom={13} maxBounds={TOLEDO_BOUNDS} style={{ height: '100%', width: '100%' }}>
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                <LocationMarker />
                            </MapContainer>
                        </div>

                        <div className="form-section-meta inline-controls">
                            <div className="input-block-small">
                                <label>Date</label>
                                <input type="date" id="date" value={formData.date} onChange={handleInputChange} required disabled={isUploading}/>
                            </div>
                            <div className="status-selector">
                                <button 
                                    type="button" 
                                    className={`toggle-btn lost-btn ${itemStatus === 'Lost' ? 'selected' : ''}`} 
                                    onClick={() => handleStatusChange('Lost')} 
                                    disabled={isUploading}
                                >
                                    Lost
                                </button>
                                <button 
                                    type="button" 
                                    className={`toggle-btn found-btn ${itemStatus === 'Found' ? 'selected' : ''}`} 
                                    onClick={() => handleStatusChange('Found')} 
                                    disabled={isUploading}
                                >
                                    Found
                                </button>
                            </div>
                        </div>

                        <div className="form-section-main flex-grid">
                            <div className="input-block description-box">
                                <label>Description</label>
                                <textarea id="description" rows="4" value={formData.description} onChange={handleInputChange} disabled={isUploading}></textarea>
                            </div>
                            <div className="input-block">
                                <label>Image</label>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" disabled={isUploading}/>
                            </div>
                        </div>

                        <button type="submit" className="final-report-btn" disabled={isUploading}>
                            {isUploading ? "Uploading..." : "Publish Report"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default ReportItem;