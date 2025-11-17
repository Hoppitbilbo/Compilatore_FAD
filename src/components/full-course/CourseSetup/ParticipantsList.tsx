import React, { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CourseParticipant } from '../../../types/course';
import { FiTrash2, FiPlus, FiEdit2, FiCheck, FiX, FiMenu, FiUsers, FiUserX } from 'react-icons/fi';
import styles from './ParticipantsList.module.css';

interface ParticipantsListProps {
  participants: CourseParticipant[];
  onParticipantsChange: (participants: CourseParticipant[]) => void;
  isLoading?: boolean;
}

interface SortableParticipantProps {
  participant: CourseParticipant;
  onEdit: (participant: CourseParticipant) => void;
  onDelete: (id: string) => void;
  onTogglePermanentAbsent: (id: string) => void;
  onMergeWith?: (id: string) => void;
  isEditing: boolean;
  onSaveEdit: (participant: CourseParticipant) => void;
  onCancelEdit: () => void;
  mergeMode?: boolean;
  selectedForMerge?: string | null;
}

const SortableParticipant: React.FC<SortableParticipantProps> = ({
  participant,
  onEdit,
  onDelete,
  onTogglePermanentAbsent,
  onMergeWith,
  isEditing,
  onSaveEdit,
  onCancelEdit,
  mergeMode = false,
  selectedForMerge = null,
}) => {
  const [editData, setEditData] = useState(participant);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: participant.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSave = () => {
    if (editData.name.trim() && editData.email.trim()) {
      onSaveEdit(editData);
    }
  };

  const handleCancel = () => {
    setEditData(participant);
    onCancelEdit();
  };

  return (
    <div ref={setNodeRef} style={style} className={styles.participantItem}>
      <div className={styles.participantDragHandle} {...attributes} {...listeners}>
        <FiMenu />
      </div>
      
      <div className={styles.participantOrder}>
        {participant.enrollmentOrder}
      </div>

      {isEditing ? (
        <div className={styles.participantEditForm}>
          <input
            type="text"
            value={editData.name}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            placeholder="Nome partecipante"
            className={styles.editInput}
          />
          <input
            type="email"
            value={editData.email}
            onChange={(e) => setEditData({ ...editData, email: e.target.value })}
            placeholder="email@example.com"
            className={styles.editInput}
          />
          <div className={styles.editActions}>
            <button onClick={handleSave} className={`${styles.btnIcon} ${styles.btnSuccess}`} title="Salva">
              <FiCheck />
            </button>
            <button onClick={handleCancel} className={`${styles.btnIcon} ${styles.btnDanger}`} title="Annulla">
              <FiX />
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.participantInfo}>
          <div className={styles.participantName}>
            {participant.name}
            {participant.isPermanentAbsent && (
              <span className={styles.permanentAbsentBadge} title="Assente fisso per tutto il corso">
                🚫 Assente Fisso
              </span>
            )}
          </div>
          <div className={styles.participantEmail}>{participant.email}</div>
          {participant.aliases && participant.aliases.length > 0 && (
            <div className={styles.aliasesList}>
              <span className={styles.aliasesLabel}>Alias:</span>
              {participant.aliases.map((alias, idx) => (
                <span key={idx} className={styles.aliasTag}>
                  {alias.name}
                  {alias.originalEnrollmentOrder && ` (#${alias.originalEnrollmentOrder})`}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {!isEditing && (
        <div className={styles.participantActions}>
          {mergeMode && onMergeWith && (
            <button
              onClick={() => onMergeWith(participant.id)}
              className={`${styles.btnIcon} ${
                selectedForMerge === participant.id ? styles.btnSelected : styles.btnMerge
              }`}
              title={selectedForMerge === null ? "Seleziona come principale" : "Unisci a questo"}
            >
              <FiUsers />
            </button>
          )}
          {!mergeMode && (
            <>
              <button
                onClick={() => onTogglePermanentAbsent(participant.id)}
                className={`${styles.btnIcon} ${
                  participant.isPermanentAbsent ? styles.btnAbsentActive : styles.btnAbsent
                }`}
                title={participant.isPermanentAbsent ? "Rimuovi da assenti fissi" : "Marca come assente fisso"}
              >
                <FiUserX />
              </button>
              <button
                onClick={() => onEdit(participant)}
                className={`${styles.btnIcon} ${styles.btnEdit}`}
                title="Modifica"
              >
                <FiEdit2 />
              </button>
              <button
                onClick={() => onDelete(participant.id)}
                className={`${styles.btnIcon} ${styles.btnDelete}`}
                title="Elimina"
              >
                <FiTrash2 />
              </button>
            </>
          )}
        </div>
      )}

    </div>
  );
};

export const ParticipantsList: React.FC<ParticipantsListProps> = ({
  participants,
  onParticipantsChange,
  isLoading = false,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newParticipant, setNewParticipant] = useState({ name: '', email: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedForMerge, setSelectedForMerge] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = participants.findIndex((p) => p.id === active.id);
      const newIndex = participants.findIndex((p) => p.id === over.id);
      
      const reorderedParticipants = arrayMove(participants, oldIndex, newIndex);
      
      // Update enrollment order
      const updatedParticipants = reorderedParticipants.map((participant, index) => ({
        ...participant,
        enrollmentOrder: index + 1,
      }));
      
      onParticipantsChange(updatedParticipants);
    }
  };

  const handleAddParticipant = () => {
    if (newParticipant.name.trim() && newParticipant.email.trim()) {
      const participant: CourseParticipant = {
        id: `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: newParticipant.name.trim(),
        email: newParticipant.email.trim(),
        enrollmentOrder: participants.length + 1,
        isActive: true,
      };
      
      onParticipantsChange([...participants, participant]);
      setNewParticipant({ name: '', email: '' });
      setShowAddForm(false);
    }
  };

  const handleEditParticipant = (participant: CourseParticipant) => {
    setEditingId(participant.id);
  };

  const handleSaveEdit = (updatedParticipant: CourseParticipant) => {
    const updatedParticipants = participants.map((p) =>
      p.id === updatedParticipant.id ? updatedParticipant : p
    );
    onParticipantsChange(updatedParticipants);
    setEditingId(null);
  };

  const handleDeleteParticipant = (id: string) => {
    const filteredParticipants = participants
      .filter((p) => p.id !== id)
      .map((participant, index) => ({
        ...participant,
        enrollmentOrder: index + 1,
      }));

    onParticipantsChange(filteredParticipants);
  };

  const handleTogglePermanentAbsent = (id: string) => {
    const updatedParticipants = participants.map((p) =>
      p.id === id
        ? { ...p, isPermanentAbsent: !p.isPermanentAbsent }
        : p
    );
    onParticipantsChange(updatedParticipants);
  };

  const handleToggleMergeMode = () => {
    setMergeMode(!mergeMode);
    setSelectedForMerge(null);
  };

  const handleCancelMerge = () => {
    setMergeMode(false);
    setSelectedForMerge(null);
  };

  const handleMergeSelection = (id: string) => {
    if (selectedForMerge === null) {
      // First selection - this will be the target (main participant)
      setSelectedForMerge(id);
    } else if (selectedForMerge === id) {
      // Clicking the same one - deselect
      setSelectedForMerge(null);
    } else {
      // Second selection - merge source into target
      const targetParticipant = participants.find((p) => p.id === selectedForMerge);
      const sourceParticipant = participants.find((p) => p.id === id);

      if (targetParticipant && sourceParticipant) {
        // Create merged participant
        const mergedParticipant: CourseParticipant = {
          ...targetParticipant,
          aliases: [
            ...(targetParticipant.aliases || []),
            {
              name: sourceParticipant.name,
              originalEnrollmentOrder: sourceParticipant.enrollmentOrder,
            },
            ...(sourceParticipant.aliases || []),
          ],
          mergedFromIds: [
            ...(targetParticipant.mergedFromIds || []),
            sourceParticipant.id,
            ...(sourceParticipant.mergedFromIds || []),
          ],
        };

        // Remove source participant and update target
        const updatedParticipants = participants
          .filter((p) => p.id !== id)
          .map((p) => (p.id === selectedForMerge ? mergedParticipant : p))
          .map((participant, index) => ({
            ...participant,
            enrollmentOrder: index + 1,
          }));

        onParticipantsChange(updatedParticipants);
        setMergeMode(false);
        setSelectedForMerge(null);
      }
    }
  };

  return (
    <div className={styles.participantsList}>
      <div className={styles.participantsHeader}>
        <h3>Partecipanti ({participants.length})</h3>
        <div className={styles.headerActions}>
          <button
            onClick={handleToggleMergeMode}
            className={`${styles.btn} ${mergeMode ? styles.btnMergeActive : styles.btnSecondary}`}
            disabled={isLoading || participants.length < 2}
            title="Unisci partecipanti con nomi diversi"
          >
            <FiUsers /> {mergeMode ? 'Annulla Merge' : 'Unisci Partecipanti'}
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={isLoading}
          >
            <FiPlus /> Aggiungi Partecipante
          </button>
        </div>
      </div>

      {mergeMode && (
        <div className={styles.mergeInstructions}>
          {selectedForMerge === null ? (
            <span>📌 Seleziona il partecipante principale (destinazione)</span>
          ) : (
            <span>📌 Ora clicca su un altro partecipante per unirlo</span>
          )}
          <button onClick={handleCancelMerge} className={styles.btnCancelMerge}>
            <FiX /> Annulla
          </button>
        </div>
      )}

      {showAddForm && (
        <div className={styles.addParticipantForm}>
          <input
            type="text"
            value={newParticipant.name}
            onChange={(e) => setNewParticipant({ ...newParticipant, name: e.target.value })}
            placeholder="Nome partecipante"
            className={styles.formInput}
          />
          <input
            type="email"
            value={newParticipant.email}
            onChange={(e) => setNewParticipant({ ...newParticipant, email: e.target.value })}
            placeholder="email@example.com"
            className={styles.formInput}
          />
          <div className={styles.formActions}>
            <button onClick={handleAddParticipant} className={`${styles.btn} ${styles.btnSuccess}`}>
              <FiCheck /> Aggiungi
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewParticipant({ name: '', email: '' });
              }}
              className={`${styles.btn} ${styles.btnSecondary}`}
            >
              <FiX /> Annulla
            </button>
          </div>
        </div>
      )}

      {participants.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Nessun partecipante aggiunto ancora.</p>
          <p>Clicca "Aggiungi Partecipante" per iniziare.</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={participants.map(p => p.id)} strategy={verticalListSortingStrategy}>
            <div className={styles.participantsContainer}>
              {participants.map((participant) => (
                <SortableParticipant
                  key={participant.id}
                  participant={participant}
                  onEdit={handleEditParticipant}
                  onDelete={handleDeleteParticipant}
                  onTogglePermanentAbsent={handleTogglePermanentAbsent}
                  onMergeWith={handleMergeSelection}
                  isEditing={editingId === participant.id}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={() => setEditingId(null)}
                  mergeMode={mergeMode}
                  selectedForMerge={selectedForMerge}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <div className={styles.participantsInfo}>
        <p>💡 Trascina i partecipanti per riordinarli secondo l'ordine di iscrizione</p>
      </div>

    </div>
  );
};
