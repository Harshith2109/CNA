import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import TaskItem from './TaskItem';

const TaskDashboard = () => {
  const { user, token, logout, API_BASE_URL } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'active' | 'completed'
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [error, setError] = useState('');

  // Fetch tasks on mount
  useEffect(() => {
    fetchTasks();
  }, [token]);

  const fetchTasks = async () => {
    setLoadingTasks(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/tasks`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setTasks(data);
      } else {
        setError(data.error || 'Failed to retrieve tasks');
      }
    } catch (err) {
      setError('Could not connect to task service.');
    } finally {
      setLoadingTasks(false);
    }
  };

  // Add a task
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title, description })
      });
      const data = await res.json();

      if (res.ok) {
        setTasks([data, ...tasks]);
        setTitle('');
        setDescription('');
      } else {
        setError(data.error || 'Failed to create task');
      }
    } catch (err) {
      setError('Could not connect to server.');
    }
  };

  // Toggle complete state
  const handleToggleComplete = async (taskId, currentCompleted) => {
    try {
      const res = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ completed: !currentCompleted })
      });
      const data = await res.json();

      if (res.ok) {
        setTasks(tasks.map(task => task._id === taskId ? data : task));
      }
    } catch (err) {
      console.error('Error toggling task complete:', err);
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        setTasks(tasks.filter(task => task._id !== taskId));
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete task');
      }
    } catch (err) {
      setError('Could not delete task.');
    }
  };

  // Update task title & description
  const handleUpdateTask = async (taskId, updatedTitle, updatedDescription) => {
    try {
      const res = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: updatedTitle, description: updatedDescription })
      });
      const data = await res.json();

      if (res.ok) {
        setTasks(tasks.map(task => task._id === taskId ? data : task));
        return true;
      } else {
        setError(data.error || 'Failed to update task');
        return false;
      }
    } catch (err) {
      setError('Could not update task.');
      return false;
    }
  };

  // Filter computations
  const filteredTasks = tasks.filter(task => {
    if (filter === 'active') return !task.completed;
    if (filter === 'completed') return task.completed;
    return true;
  });

  const activeCount = tasks.filter(t => !t.completed).length;

  return (
    <div className="dashboard-container">
      {/* Navigation Header */}
      <nav className="navbar">
        <div className="navbar-brand">
          <span>⚡</span>
          <span>TaskFlow</span>
        </div>
        <div className="navbar-user">
          <span className="username-badge">@{user?.username}</span>
          <button onClick={logout} className="btn btn-secondary btn-sm" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
            Logout
          </button>
        </div>
      </nav>

      {/* Main dashboard content */}
      <main className="dashboard-content">
        {error && (
          <div className="alert alert-danger">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* Form to add new task */}
        <div className="task-form-card">
          <h2>Create New Task</h2>
          <form onSubmit={handleAddTask}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="task-title">Task Title</label>
                <input
                  type="text"
                  id="task-title"
                  className="input-control"
                  placeholder="e.g. Write CI/CD configuration"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label htmlFor="task-desc">Description (Optional)</label>
              <textarea
                id="task-desc"
                className="input-control"
                placeholder="e.g. Set up GitHub Actions workflow in .github/workflows/ci.yml"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="2"
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary">
                Add Task
              </button>
            </div>
          </form>
        </div>

        {/* Filter bar */}
        <div className="filter-bar">
          <div className="filter-tabs">
            <button
              onClick={() => setFilter('all')}
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
            >
              Active
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
            >
              Completed
            </button>
          </div>
          <div className="task-counter">
            {activeCount} active {activeCount === 1 ? 'task' : 'tasks'} remaining
          </div>
        </div>

        {/* Tasks list */}
        <div className="tasks-list">
          {loadingTasks ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              Loading tasks...
            </div>
          ) : filteredTasks.length > 0 ? (
            filteredTasks.map(task => (
              <TaskItem
                key={task._id}
                task={task}
                onToggleComplete={handleToggleComplete}
                onDelete={handleDeleteTask}
                onUpdate={handleUpdateTask}
              />
            ))
          ) : (
            <div className="empty-state">
              <h3>No tasks found</h3>
              <p>
                {filter === 'all'
                  ? "You don't have any tasks created yet. Get started above!"
                  : filter === 'active'
                  ? 'All tasks have been successfully completed!'
                  : "You haven't completed any tasks yet."}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TaskDashboard;
