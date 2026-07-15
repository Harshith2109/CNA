import React, { useState } from 'react';

const TaskItem = ({ task, onToggleComplete, onDelete, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description || '');

  const handleSave = async () => {
    if (!editTitle.trim()) return;
    const success = await onUpdate(task._id, editTitle, editDescription);
    if (success) {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setIsEditing(false);
  };

  return (
    <div className={`task-item ${task.completed ? 'completed-task' : ''}`}>
      {/* Checkbox */}
      {!isEditing && (
        <div className="task-checkbox-container">
          <input
            type="checkbox"
            className="task-checkbox"
            checked={task.completed}
            onChange={() => onToggleComplete(task._id, task.completed)}
          />
        </div>
      )}

      {/* Main content body */}
      <div className="task-body">
        {isEditing ? (
          <div className="edit-form-control">
            <input
              type="text"
              className="input-control"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Task Title"
              required
            />
            <textarea
              className="input-control"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Task Description"
              rows="2"
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
            <div className="edit-actions">
              <button onClick={handleSave} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                Save
              </button>
              <button onClick={handleCancel} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="task-title">{task.title}</div>
            {task.description && <div className="task-desc">{task.description}</div>}
          </>
        )}
      </div>

      {/* Action buttons (Delete & Edit) */}
      {!isEditing && (
        <div className="task-actions">
          <button
            onClick={() => setIsEditing(true)}
            className="icon-btn btn-edit"
            title="Edit Task"
            aria-label="Edit Task"
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete(task._id)}
            className="icon-btn btn-delete"
            title="Delete Task"
            aria-label="Delete Task"
          >
            🗑️
          </button>
        </div>
      )}
    </div>
  );
};

export default TaskItem;
