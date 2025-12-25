import { useState, useEffect } from 'react';
import './FamilyAlbum.css';

interface FamilyMember {
  name: string;
  relationship: string;
  age?: number;
  location?: string;
  occupation?: string;
  children?: string[];
  photoUrls?: string[];
  notes?: string[];
}

interface FamilyAlbumProps {
  userId: string;
}

const FamilyAlbum = ({ userId }: FamilyAlbumProps) => {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMember, setNewMember] = useState<Partial<FamilyMember>>({});

  useEffect(() => {
    loadFamilyMembers();
  }, [userId]);

  const loadFamilyMembers = async () => {
    try {
      const response = await fetch(`/api/family/${userId}`);
      const data = await response.json();
      if (data.success) {
        setFamilyMembers(data.data);
      }
    } catch (error) {
      console.error('Error loading family members:', error);
    }
  };

  const addFamilyMember = async () => {
    try {
      const response = await fetch(`/api/family/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMember)
      });
      const data = await response.json();
      if (data.success) {
        await loadFamilyMembers();
        setShowAddForm(false);
        setNewMember({});
      }
    } catch (error) {
      console.error('Error adding family member:', error);
    }
  };

  const uploadPhoto = async (memberName: string, file: File) => {
    try {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await fetch(`/api/photos/${userId}/${memberName}`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        await loadFamilyMembers();
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
    }
  };

  return (
    <div className="family-album">
      <div className="album-header">
        <h2>Family Album</h2>
        <button onClick={() => setShowAddForm(true)}>+ Add Family Member</button>
      </div>

      {showAddForm && (
        <div className="add-member-form">
          <h3>Add Family Member</h3>
          <input
            type="text"
            placeholder="Name"
            value={newMember.name || ''}
            onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
          />
          <input
            type="text"
            placeholder="Relationship (e.g., daughter, son)"
            value={newMember.relationship || ''}
            onChange={(e) => setNewMember({ ...newMember, relationship: e.target.value })}
          />
          <input
            type="number"
            placeholder="Age"
            value={newMember.age || ''}
            onChange={(e) => setNewMember({ ...newMember, age: parseInt(e.target.value) })}
          />
          <input
            type="text"
            placeholder="Location"
            value={newMember.location || ''}
            onChange={(e) => setNewMember({ ...newMember, location: e.target.value })}
          />
          <div className="form-actions">
            <button onClick={addFamilyMember}>Save</button>
            <button onClick={() => setShowAddForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="family-grid">
        {familyMembers.map((member, index) => (
          <div 
            key={index} 
            className="family-card"
            onClick={() => setSelectedMember(member)}
          >
            <div className="member-avatar">
              {member.photoUrls && member.photoUrls.length > 0 ? (
                <img src={member.photoUrls[0]} alt={member.name} />
              ) : (
                <div className="avatar-placeholder">{member.name[0]}</div>
              )}
            </div>
            <h3>{member.name}</h3>
            <p>{member.relationship}</p>
          </div>
        ))}
      </div>

      {selectedMember && (
        <div className="member-detail-modal" onClick={() => setSelectedMember(null)}>
          <div className="member-detail" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedMember(null)}>✕</button>
            <h2>{selectedMember.name}</h2>
            <p><strong>Relationship:</strong> {selectedMember.relationship}</p>
            {selectedMember.age && <p><strong>Age:</strong> {selectedMember.age}</p>}
            {selectedMember.location && <p><strong>Location:</strong> {selectedMember.location}</p>}
            {selectedMember.occupation && <p><strong>Occupation:</strong> {selectedMember.occupation}</p>}
            
            <div className="photo-upload">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    uploadPhoto(selectedMember.name, e.target.files[0]);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilyAlbum;

