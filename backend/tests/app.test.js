const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Task = require('../src/models/Task');
const jwt = require('jsonwebtoken');

// Mock User model with constructor property propagation
jest.mock('../src/models/User', () => {
  const mockUserInstance = {
    _id: '507f1f77bcf86cd799439011',
    username: 'testuser',
    email: 'test@example.com',
    comparePassword: jest.fn()
  };

  const UserConstructor = jest.fn().mockImplementation((data) => {
    return {
      _id: mockUserInstance._id,
      username: data.username || mockUserInstance.username,
      email: data.email || mockUserInstance.email,
      password: data.password,
      save: jest.fn().mockResolvedValue({
        _id: mockUserInstance._id,
        username: data.username || mockUserInstance.username,
        email: data.email || mockUserInstance.email
      }),
      comparePassword: mockUserInstance.comparePassword
    };
  });

  UserConstructor.findOne = jest.fn();
  UserConstructor.findById = jest.fn();
  UserConstructor.mockUserInstance = mockUserInstance; // Expose to test block
  
  return UserConstructor;
});

// Mock Task model with constructor property propagation
jest.mock('../src/models/Task', () => {
  const TaskConstructor = jest.fn().mockImplementation((data) => {
    return {
      _id: '3',
      title: data.title,
      description: data.description,
      completed: false,
      user: data.user,
      save: jest.fn().mockResolvedValue({
        _id: '3',
        title: data.title,
        description: data.description,
        completed: false,
        user: data.user
      })
    };
  });

  TaskConstructor.find = jest.fn();
  TaskConstructor.findOne = jest.fn();
  TaskConstructor.findOneAndDelete = jest.fn();
  
  return TaskConstructor;
});

describe('MERN Backend API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Auth Endpoints', () => {
    const mockUser = User.mockUserInstance;

    describe('POST /api/auth/register', () => {
      it('should register a new user and return user info + token', async () => {
        User.findOne.mockResolvedValue(null);

        const res = await request(app)
          .post('/api/auth/register')
          .send({
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123'
          });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('token');
        expect(res.body.user).toEqual({
          id: mockUser._id,
          username: 'testuser',
          email: 'test@example.com'
        });
      });

      it('should return 400 if email already exists', async () => {
        User.findOne.mockResolvedValue(mockUser);

        const res = await request(app)
          .post('/api/auth/register')
          .send({
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123'
          });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error', 'Email is already registered');
      });
    });

    describe('POST /api/auth/login', () => {
      it('should login user with correct credentials', async () => {
        User.findOne.mockResolvedValue(mockUser);
        mockUser.comparePassword.mockResolvedValue(true);

        const res = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'password123'
          });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('token');
        expect(res.body.user.email).toBe(mockUser.email);
      });

      it('should return 400 with invalid credentials', async () => {
        User.findOne.mockResolvedValue(mockUser);
        mockUser.comparePassword.mockResolvedValue(false);

        const res = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword'
          });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error', 'Invalid email or password');
      });
    });
  });

  describe('Tasks Endpoints (Protected)', () => {
    let token;
    const mockUser = User.mockUserInstance;

    beforeAll(() => {
      token = jwt.sign({ id: mockUser._id }, 'supersecretjwtkeyplaceholder');
    });

    beforeEach(() => {
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser)
      });
    });

    describe('GET /api/tasks', () => {
      it('should retrieve all tasks of authenticated user', async () => {
        const mockTasks = [
          { _id: '1', title: 'Task 1', completed: false, user: mockUser._id },
          { _id: '2', title: 'Task 2', completed: true, user: mockUser._id }
        ];

        Task.find.mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockTasks)
        });

        const res = await request(app)
          .get('/api/tasks')
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
        expect(res.body[0].title).toBe('Task 1');
      });

      it('should return 401 if token is not provided', async () => {
        const res = await request(app).get('/api/tasks');
        expect(res.status).toBe(401);
      });
    });

    describe('POST /api/tasks', () => {
      it('should create a new task', async () => {
        const mockNewTask = {
          title: 'New Task',
          description: 'New Description'
        };

        const res = await request(app)
          .post('/api/tasks')
          .set('Authorization', `Bearer ${token}`)
          .send(mockNewTask);

        expect(res.status).toBe(201);
        expect(res.body.title).toBe('New Task');
        expect(res.body.completed).toBe(false);
      });

      it('should return 400 if title is missing', async () => {
        const res = await request(app)
          .post('/api/tasks')
          .set('Authorization', `Bearer ${token}`)
          .send({ description: 'No Title' });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error', 'Title is required');
      });
    });
  });
});

