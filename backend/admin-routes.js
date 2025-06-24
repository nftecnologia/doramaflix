/**
 * Admin Dashboard Routes - Agent 9
 * Administrative panel for DoramaFlix management
 */

const express = require('express');
const { requireAdmin, requireManager } = require('./src/middleware/jwt-auth');

const router = express.Router();

// Mock data storage (replace with real database)
let users = [
  {
    id: '1',
    email: 'admin@doramaflix.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    status: 'active',
    createdAt: '2024-01-01T00:00:00Z',
    lastLoginAt: '2025-06-24T20:00:00Z'
  },
  {
    id: '2', 
    email: 'manager@doramaflix.com',
    firstName: 'Manager',
    lastName: 'User',
    role: 'manager',
    status: 'active',
    createdAt: '2024-01-15T00:00:00Z',
    lastLoginAt: '2025-06-24T19:30:00Z'
  },
  {
    id: '3',
    email: 'student@doramaflix.com',
    firstName: 'Student',
    lastName: 'User', 
    role: 'student',
    status: 'active',
    createdAt: '2024-02-01T00:00:00Z',
    lastLoginAt: '2025-06-24T18:45:00Z'
  }
];

let content = [
  {
    id: '1',
    title: 'Descendentes do Sol',
    type: 'series',
    status: 'published',
    episodes: 16,
    views: 125000,
    rating: 8.7,
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-06-20T00:00:00Z'
  },
  {
    id: '2',
    title: 'Hotel Del Luna', 
    type: 'series',
    status: 'published',
    episodes: 16,
    views: 98500,
    rating: 8.9,
    createdAt: '2024-02-15T00:00:00Z',
    updatedAt: '2024-06-22T00:00:00Z'
  }
];

// Dashboard Overview
router.get('/dashboard', requireManager, (req, res) => {
  try {
    const stats = {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.status === 'active').length,
      totalContent: content.length,
      publishedContent: content.filter(c => c.status === 'published').length,
      totalViews: content.reduce((sum, c) => sum + c.views, 0),
      averageRating: (content.reduce((sum, c) => sum + c.rating, 0) / content.length).toFixed(1),
      recentUsers: users.slice(-5).reverse(),
      recentContent: content.slice(-5).reverse(),
      usersByRole: {
        admin: users.filter(u => u.role === 'admin').length,
        manager: users.filter(u => u.role === 'manager').length,
        student: users.filter(u => u.role === 'student').length
      },
      contentByStatus: {
        published: content.filter(c => c.status === 'published').length,
        draft: content.filter(c => c.status === 'draft').length,
        archived: content.filter(c => c.status === 'archived').length
      }
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load dashboard data'
    });
  }
});

// User Management
router.get('/users', requireManager, (req, res) => {
  try {
    const { page = 1, limit = 20, role, status, search } = req.query;
    
    let filteredUsers = [...users];

    // Filter by role
    if (role && role !== 'all') {
      filteredUsers = filteredUsers.filter(u => u.role === role);
    }

    // Filter by status
    if (status && status !== 'all') {
      filteredUsers = filteredUsers.filter(u => u.status === status);
    }

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = filteredUsers.filter(u => 
        u.email.toLowerCase().includes(searchLower) ||
        u.firstName.toLowerCase().includes(searchLower) ||
        u.lastName.toLowerCase().includes(searchLower)
      );
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedUsers,
      pagination: {
        total: filteredUsers.length,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(filteredUsers.length / limit)
      }
    });

  } catch (error) {
    console.error('Users list error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load users'
    });
  }
});

// Get single user
router.get('/users/:id', requireManager, (req, res) => {
  try {
    const user = users.find(u => u.id === req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Add user activity data (mock)
    const userWithActivity = {
      ...user,
      activity: {
        watchedEpisodes: 45,
        favoriteShows: 12,
        totalWatchTime: '2h 45m',
        lastActive: user.lastLoginAt,
        deviceInfo: {
          lastDevice: 'Chrome on MacOS',
          ipAddress: '192.168.1.100'
        }
      }
    };

    res.json({
      success: true,
      data: userWithActivity
    });

  } catch (error) {
    console.error('User details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load user details'
    });
  }
});

// Update user
router.put('/users/:id', requireManager, (req, res) => {
  try {
    const userIndex = users.findIndex(u => u.id === req.params.id);
    
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Only allow updating certain fields
    const allowedFields = ['firstName', 'lastName', 'role', 'status'];
    const updateData = {};
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // Update user
    users[userIndex] = {
      ...users[userIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      data: users[userIndex],
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error('User update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user'
    });
  }
});

// Delete user
router.delete('/users/:id', requireAdmin, (req, res) => {
  try {
    const userIndex = users.findIndex(u => u.id === req.params.id);
    
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Don't allow deleting the last admin
    if (users[userIndex].role === 'admin') {
      const adminCount = users.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete the last admin user'
        });
      }
    }

    const deletedUser = users.splice(userIndex, 1)[0];

    res.json({
      success: true,
      data: deletedUser,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('User delete error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
});

// Content Management
router.get('/content', requireManager, (req, res) => {
  try {
    const { page = 1, limit = 20, type, status, search } = req.query;
    
    let filteredContent = [...content];

    // Filter by type
    if (type && type !== 'all') {
      filteredContent = filteredContent.filter(c => c.type === type);
    }

    // Filter by status
    if (status && status !== 'all') {
      filteredContent = filteredContent.filter(c => c.status === status);
    }

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filteredContent = filteredContent.filter(c => 
        c.title.toLowerCase().includes(searchLower)
      );
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedContent = filteredContent.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedContent,
      pagination: {
        total: filteredContent.length,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(filteredContent.length / limit)
      }
    });

  } catch (error) {
    console.error('Content list error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load content'
    });
  }
});

// Create content
router.post('/content', requireManager, (req, res) => {
  try {
    const { title, type, description, episodes } = req.body;

    if (!title || !type) {
      return res.status(400).json({
        success: false,
        error: 'Title and type are required'
      });
    }

    const newContent = {
      id: (content.length + 1).toString(),
      title,
      type,
      description: description || '',
      episodes: episodes || 1,
      status: 'draft',
      views: 0,
      rating: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    content.push(newContent);

    res.status(201).json({
      success: true,
      data: newContent,
      message: 'Content created successfully'
    });

  } catch (error) {
    console.error('Content create error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create content'
    });
  }
});

// Update content
router.put('/content/:id', requireManager, (req, res) => {
  try {
    const contentIndex = content.findIndex(c => c.id === req.params.id);
    
    if (contentIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Content not found'
      });
    }

    const allowedFields = ['title', 'type', 'description', 'episodes', 'status', 'rating'];
    const updateData = {};
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    content[contentIndex] = {
      ...content[contentIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      data: content[contentIndex],
      message: 'Content updated successfully'
    });

  } catch (error) {
    console.error('Content update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update content'
    });
  }
});

// Delete content
router.delete('/content/:id', requireAdmin, (req, res) => {
  try {
    const contentIndex = content.findIndex(c => c.id === req.params.id);
    
    if (contentIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Content not found'
      });
    }

    const deletedContent = content.splice(contentIndex, 1)[0];

    res.json({
      success: true,
      data: deletedContent,
      message: 'Content deleted successfully'
    });

  } catch (error) {
    console.error('Content delete error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete content'
    });
  }
});

// Analytics
router.get('/analytics', requireManager, (req, res) => {
  try {
    const { period = '7d' } = req.query;

    // Mock analytics data
    const analytics = {
      period,
      users: {
        total: users.length,
        new: Math.floor(users.length * 0.1),
        active: Math.floor(users.length * 0.8),
        growth: '+12%'
      },
      content: {
        total: content.length,
        published: content.filter(c => c.status === 'published').length,
        views: content.reduce((sum, c) => sum + c.views, 0),
        averageRating: (content.reduce((sum, c) => sum + c.rating, 0) / content.length).toFixed(1)
      },
      engagement: {
        watchTime: '1,234h',
        completionRate: '78%',
        favoriteRate: '34%',
        searchQueries: 456
      },
      topContent: content
        .sort((a, b) => b.views - a.views)
        .slice(0, 5)
        .map(c => ({
          title: c.title,
          views: c.views,
          rating: c.rating
        })),
      userActivity: [
        { date: '2025-06-18', users: 45 },
        { date: '2025-06-19', users: 52 },
        { date: '2025-06-20', users: 48 },
        { date: '2025-06-21', users: 67 },
        { date: '2025-06-22', users: 71 },
        { date: '2025-06-23', users: 58 },
        { date: '2025-06-24', users: 63 }
      ]
    };

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load analytics'
    });
  }
});

module.exports = router;