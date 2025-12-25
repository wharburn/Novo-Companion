import { useEffect, useRef, useState } from 'react';
import './FamilyTreeEditor.css';

interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  birthDate?: string;
  location?: string;
  occupation?: string;
  notes?: string;
  photoUrl?: string;
  parentId?: string;
  spouseId?: string;
}

interface FamilyTreeEditorProps {
  userId: string;
}

const RELATIONSHIPS = [
  'Self (User)',
  'Spouse',
  'Son',
  'Daughter',
  'Grandson',
  'Granddaughter',
  'Brother',
  'Sister',
  'Mother',
  'Father',
  'Son-in-law',
  'Daughter-in-law',
  'Niece',
  'Nephew',
  'Cousin',
  'Friend',
  'Caregiver',
  'Other',
];

const FamilyTreeEditor = ({ userId }: FamilyTreeEditorProps) => {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [showForm, setShowForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFamilyTree();
  }, [userId]);

  const loadFamilyTree = async () => {
    try {
      const response = await fetch(`/api/family/${userId}/tree`);
      const data = await response.json();
      if (data.success) {
        setMembers(data.data || []);
      }
    } catch (error) {
      console.error('Error loading family tree:', error);
    }
  };

  const saveMember = async () => {
    if (!editingMember?.name || !editingMember?.relationship) {
      alert('Name and relationship are required');
      return;
    }

    try {
      const method = editingMember.id ? 'PUT' : 'POST';
      const url = editingMember.id
        ? `/api/family/${userId}/tree/${editingMember.id}`
        : `/api/family/${userId}/tree`;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingMember),
      });

      const data = await response.json();
      if (data.success) {
        await loadFamilyTree();
        setEditingMember(null);
        setShowForm(false);
      }
    } catch (error) {
      console.error('Error saving family member:', error);
    }
  };

  const deleteMember = async (id: string) => {
    if (!confirm('Are you sure you want to remove this family member?')) return;

    try {
      const response = await fetch(`/api/family/${userId}/tree/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        await loadFamilyTree();
      }
    } catch (error) {
      console.error('Error deleting family member:', error);
    }
  };

  const uploadPhoto = async (memberId: string, file: File) => {
    try {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await fetch(`/api/family/${userId}/tree/${memberId}/photo`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        await loadFamilyTree();
        if (editingMember && editingMember.id === memberId) {
          setEditingMember({ ...editingMember, photoUrl: data.photoUrl });
        }
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
    }
  };

  const startEdit = (member: FamilyMember) => {
    setEditingMember({ ...member });
    setShowForm(true);
  };

  const startNew = () => {
    setEditingMember({
      id: '',
      name: '',
      relationship: '',
    });
    setShowForm(true);
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingMember?.id) {
      uploadPhoto(editingMember.id, file);
    }
  };

  return (
    <div className="family-tree-editor">
      <div className="editor-header">
        <h3>👨‍👩‍👧‍👦 Family Tree</h3>
        <p className="editor-description">
          Add family members so NoVo can discuss them with the user
        </p>
        <button type="button" className="add-member-btn" onClick={startNew}>
          + Add Family Member
        </button>
      </div>

      <div className="members-list">
        {members.map((member) => (
          <div key={member.id} className="member-card">
            <div className="member-photo">
              {member.photoUrl ? (
                <img src={member.photoUrl} alt={member.name} />
              ) : (
                <div className="photo-placeholder">{member.name[0]?.toUpperCase()}</div>
              )}
            </div>
            <div className="member-info">
              <h4>{member.name}</h4>
              <p className="relationship">{member.relationship}</p>
              {member.location && <p className="location">📍 {member.location}</p>}
            </div>
            <div className="member-actions">
              <button type="button" onClick={() => startEdit(member)}>
                ✏️
              </button>
              <button type="button" onClick={() => deleteMember(member.id)}>
                🗑️
              </button>
            </div>
          </div>
        ))}
        {members.length === 0 && <p className="no-members">No family members added yet</p>}
      </div>

      {showForm && editingMember && (
        <div className="member-form-overlay" onClick={() => setShowForm(false)}>
          <div className="member-form" onClick={(e) => e.stopPropagation()}>
            <h3>{editingMember.id ? 'Edit' : 'Add'} Family Member</h3>

            <div className="form-photo" onClick={handlePhotoClick}>
              {editingMember.photoUrl ? (
                <img src={editingMember.photoUrl} alt="Member" />
              ) : (
                <div className="photo-upload-placeholder">
                  📷
                  <br />
                  Click to add photo
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                style={{ display: 'none' }}
              />
            </div>

            <div className="form-fields">
              <input
                type="text"
                placeholder="Name *"
                value={editingMember.name}
                onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
              />

              <select
                value={editingMember.relationship}
                onChange={(e) =>
                  setEditingMember({ ...editingMember, relationship: e.target.value })
                }
              >
                <option value="">Select Relationship *</option>
                {RELATIONSHIPS.map((rel) => (
                  <option key={rel} value={rel}>
                    {rel}
                  </option>
                ))}
              </select>

              <input
                type="date"
                placeholder="Birth Date"
                value={editingMember.birthDate || ''}
                onChange={(e) => setEditingMember({ ...editingMember, birthDate: e.target.value })}
              />

              <input
                type="text"
                placeholder="Location (e.g., Chicago, IL)"
                value={editingMember.location || ''}
                onChange={(e) => setEditingMember({ ...editingMember, location: e.target.value })}
              />

              <input
                type="text"
                placeholder="Occupation"
                value={editingMember.occupation || ''}
                onChange={(e) => setEditingMember({ ...editingMember, occupation: e.target.value })}
              />

              <textarea
                placeholder="Notes (e.g., interests, important dates, topics to discuss)"
                value={editingMember.notes || ''}
                onChange={(e) => setEditingMember({ ...editingMember, notes: e.target.value })}
              />
            </div>

            <div className="form-actions">
              <button type="button" className="save-btn" onClick={saveMember}>
                Save
              </button>
              <button type="button" className="cancel-btn" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilyTreeEditor;
