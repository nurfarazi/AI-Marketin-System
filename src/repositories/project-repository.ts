import { getCollection } from '../db/mongo';
import type { Project } from '../types';

const COLLECTION_NAME = 'projects';

class ProjectRepository {
  private collection() {
    return getCollection<Project>(COLLECTION_NAME);
  }

  async create(project: Project): Promise<Project> {
    await this.collection().insertOne(project);
    return project;
  }

  async list(): Promise<Project[]> {
    return this.collection().find({}).sort({ createdAt: 1 }).toArray();
  }

  async getById(id: string): Promise<Project | null> {
    return this.collection().findOne({ id });
  }

  async update(id: string, updates: Partial<Project>): Promise<Project | null> {
    await this.collection().updateOne({ id }, { $set: updates });
    return this.getById(id);
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.collection().deleteOne({ id });
    return result.deletedCount === 1;
  }
}

export const projectRepository = new ProjectRepository();
export type { ProjectRepository };
