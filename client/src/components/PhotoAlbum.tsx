import { useEffect, useState } from 'react';
import './PhotoAlbum.css';

interface Photo {
  key: string;
  url: string;
  description: string;
  memberName: string;
  lastModified: string;
}

interface PhotoAlbumProps {
  userId: string;
  onClose: () => void;
}

const PhotoAlbum = ({ userId, onClose }: PhotoAlbumProps) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPhotos();
  }, [userId]);

  const loadPhotos = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/photos/${userId}`);
      const data = await response.json();

      if (data.success) {
        setPhotos(data.data);
      } else {
        setError(data.error || 'Failed to load photos');
      }
    } catch (err) {
      console.error('Error loading photos:', err);
      setError('Failed to load photos');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (key: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    try {
      const encodedKey = encodeURIComponent(key);
      const response = await fetch(`/api/photos/${encodedKey}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPhotos(photos.filter((p) => p.key !== key));
      } else {
        alert('Failed to delete photo');
      }
    } catch (err) {
      console.error('Error deleting photo:', err);
      alert('Failed to delete photo');
    }
  };

  return (
    <div className="photo-album-container">
      <div className="photo-album-header">
        <h2>📸 Photo Album</h2>
        <button type="button" className="close-btn" onClick={onClose}>
          ✕
        </button>
      </div>

      {loading && (
        <div className="photo-album-loading">
          <p>Loading photos...</p>
        </div>
      )}

      {error && (
        <div className="photo-album-error">
          <p>{error}</p>
          <button type="button" onClick={loadPhotos}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && photos.length === 0 && (
        <div className="photo-album-empty">
          <p>No photos yet!</p>
          <p>Take some pictures to get started.</p>
        </div>
      )}

      {!loading && !error && photos.length > 0 && (
        <div className="photo-grid">
          {photos.map((photo) => (
            <div key={photo.key} className="photo-card">
              <div className="photo-image-container">
                <img src={photo.url} alt={photo.description} />
                <button
                  type="button"
                  className="delete-photo-btn"
                  onClick={() => handleDelete(photo.key)}
                  aria-label="Delete photo"
                >
                  🗑️
                </button>
              </div>
              <div className="photo-info">
                <p className="photo-description">{photo.description}</p>
                {photo.memberName && photo.memberName !== 'general' && (
                  <p className="photo-subject">
                    <strong>{photo.memberName}</strong>
                  </p>
                )}
                <p className="photo-date">
                  {new Date(photo.lastModified).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PhotoAlbum;
