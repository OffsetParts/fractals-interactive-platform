import { User } from '../../types';

interface AuthToken {
  token: string;
  expiresAt: Date;
  userId: string;
}

export class AuthService {
  private users: Map<string, User> = new Map();
  private tokens: Map<string, AuthToken> = new Map();
  private sessionDuration = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    // Initialize with some demo users
    this.initializeDemoUsers();
  }

  private initializeDemoUsers(): void {
    const demoUsers: User[] = [
      {
        id: 'teacher1',
        email: 'teacher@example.com',
        name: 'Demo Teacher',
        role: 'teacher',
        preferences: {
          defaultQuality: 'high',
          autoPlay: true,
          showMath: true,
          notifications: true
        }
      },
      {
        id: 'student1',
        email: 'student@example.com',
        name: 'Demo Student',
        role: 'student',
        preferences: {
          defaultQuality: 'normal',
          autoPlay: false,
          showMath: true,
          notifications: false
        }
      },
      {
        id: 'admin1',
        email: 'admin@example.com',
        name: 'Demo Admin',
        role: 'admin',
        preferences: {
          defaultQuality: 'ultra',
          autoPlay: false,
          showMath: true,
          notifications: true
        }
      }
    ];

    for (const user of demoUsers) {
      this.users.set(user.email, user);
    }
  }

  async login(email: string, password: string): Promise<{
    user: User;
    token: string;
    expiresAt: Date;
  }> {
    // In a real implementation, this would verify against a database
    // For demo purposes, accept any password for existing users
    const user = this.users.get(email);
    
    if (!user) {
      throw new Error('User not found');
    }

    // In production, verify password hash
    if (password.length < 1) {
      throw new Error('Password required');
    }

    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + this.sessionDuration);

    this.tokens.set(token, {
      token,
      expiresAt,
      userId: user.id
    });

    return {
      user,
      token,
      expiresAt
    };
  }

  async logout(authHeader?: string): Promise<void> {
    if (!authHeader) return;

    const token = authHeader.replace('Bearer ', '');
    this.tokens.delete(token);
  }

  async validateToken(token: string): Promise<User | null> {
    const authToken = this.tokens.get(token);
    
    if (!authToken || authToken.expiresAt < new Date()) {
      if (authToken) {
        this.tokens.delete(token); // Clean up expired token
      }
      return null;
    }

    // Find user by ID
    for (const user of this.users.values()) {
      if (user.id === authToken.userId) {
        return user;
      }
    }

    return null;
  }

  async refreshToken(token: string): Promise<{
    token: string;
    expiresAt: Date;
  } | null> {
    const user = await this.validateToken(token);
    if (!user) return null;

    // Remove old token
    this.tokens.delete(token);

    // Create new token
    const newToken = this.generateToken();
    const expiresAt = new Date(Date.now() + this.sessionDuration);

    this.tokens.set(newToken, {
      token: newToken,
      expiresAt,
      userId: user.id
    });

    return {
      token: newToken,
      expiresAt
    };
  }

  async getUserById(id: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.id === id) {
        return user;
      }
    }
    return null;
  }

  async updateUserPreferences(userId: string, preferences: Partial<User['preferences']>): Promise<User | null> {
    const user = await this.getUserById(userId);
    if (!user) return null;

    user.preferences = {
      ...user.preferences,
      ...preferences
    };

    // In a real implementation, this would update the database
    return user;
  }

  async createUser(userData: {
    email: string;
    name: string;
    role: 'student' | 'teacher' | 'admin';
    password: string;
  }): Promise<User> {
    if (this.users.has(userData.email)) {
      throw new Error('User already exists');
    }

    const user: User = {
      id: this.generateUserId(),
      email: userData.email,
      name: userData.name,
      role: userData.role,
      preferences: {
        defaultQuality: 'normal',
        autoPlay: false,
        showMath: true,
        notifications: false
      }
    };

    this.users.set(user.email, user);
    
    // In a real implementation, store password hash in database
    return user;
  }

  private generateToken(): string {
    return `token_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }

  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Admin methods
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getActiveTokens(): Promise<number> {
    const now = new Date();
    let activeCount = 0;
    
    for (const authToken of this.tokens.values()) {
      if (authToken.expiresAt > now) {
        activeCount++;
      }
    }
    
    return activeCount;
  }

  async cleanupExpiredTokens(): Promise<number> {
    const now = new Date();
    let cleaned = 0;
    
    for (const [token, authToken] of this.tokens) {
      if (authToken.expiresAt <= now) {
        this.tokens.delete(token);
        cleaned++;
      }
    }
    
    return cleaned;
  }

  // Middleware helper
  static createAuthMiddleware(authService: AuthService) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return async (req: any, res: any, next: any) => {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return res.status(401).json({ error: 'No authorization header' });
      }

      const token = authHeader.replace('Bearer ', '');
      const user = await authService.validateToken(token);

      if (!user) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      req.user = user;
      next();
    };
  }
}