import { type User, type InsertUser, type QueryHistory, type InsertQueryHistory } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getQueryHistory(): Promise<QueryHistory[]>;
  addQueryHistory(query: InsertQueryHistory): Promise<QueryHistory>;
  clearQueryHistory(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private queryHistory: Map<string, QueryHistory>;

  constructor() {
    this.users = new Map();
    this.queryHistory = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getQueryHistory(): Promise<QueryHistory[]> {
    const history = Array.from(this.queryHistory.values());
    return history.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ).slice(0, 20);
  }

  async addQueryHistory(query: InsertQueryHistory): Promise<QueryHistory> {
    const id = randomUUID();
    const historyEntry: QueryHistory = {
      ...query,
      id,
      createdAt: new Date(),
    };
    this.queryHistory.set(id, historyEntry);
    return historyEntry;
  }

  async clearQueryHistory(): Promise<void> {
    this.queryHistory.clear();
  }
}

export const storage = new MemStorage();
