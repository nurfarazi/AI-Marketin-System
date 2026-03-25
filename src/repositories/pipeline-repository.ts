import { getCollection } from '../db/mongo';
import type {
  Analysis,
  Creative,
  Ingestion,
  Job,
  NormalizedSource,
  Report,
} from '../types';

const COLLECTIONS = {
  ingestions: 'ingestions',
  normalizedSources: 'normalized_sources',
  analyses: 'analyses',
  creatives: 'creatives',
  reports: 'reports',
  jobs: 'jobs',
} as const;

class PipelineRepository {
  private ingestions() {
    return getCollection<Ingestion>(COLLECTIONS.ingestions);
  }

  private normalizedSources() {
    return getCollection<NormalizedSource>(COLLECTIONS.normalizedSources);
  }

  private analyses() {
    return getCollection<Analysis>(COLLECTIONS.analyses);
  }

  private creatives() {
    return getCollection<Creative>(COLLECTIONS.creatives);
  }

  private reports() {
    return getCollection<Report>(COLLECTIONS.reports);
  }

  private jobs() {
    return getCollection<Job>(COLLECTIONS.jobs);
  }

  async addIngestion(ingestion: Ingestion): Promise<Ingestion> {
    await this.ingestions().insertOne(ingestion);
    return ingestion;
  }

  async listIngestions(projectId: string): Promise<Ingestion[]> {
    return this.ingestions().find({ projectId }).sort({ createdAt: 1 }).toArray();
  }

  async getIngestion(id: string): Promise<Ingestion | null> {
    return this.ingestions().findOne({ id });
  }

  async updateIngestion(id: string, updates: Partial<Ingestion>): Promise<Ingestion | null> {
    await this.ingestions().updateOne({ id }, { $set: updates });
    return this.getIngestion(id);
  }

  async addNormalizedSource(source: NormalizedSource): Promise<NormalizedSource> {
    await this.normalizedSources().insertOne(source);
    return source;
  }

  async listNormalizedSources(projectId: string): Promise<NormalizedSource[]> {
    return this.normalizedSources().find({ projectId }).sort({ createdAt: 1 }).toArray();
  }

  async getNormalizedSource(id: string): Promise<NormalizedSource | null> {
    return this.normalizedSources().findOne({ id });
  }

  async updateNormalizedSource(id: string, updates: Partial<NormalizedSource>): Promise<NormalizedSource | null> {
    await this.normalizedSources().updateOne({ id }, { $set: updates });
    return this.getNormalizedSource(id);
  }

  async addAnalysis(analysis: Analysis): Promise<Analysis> {
    await this.analyses().insertOne(analysis);
    return analysis;
  }

  async listAnalyses(projectId: string): Promise<Analysis[]> {
    return this.analyses().find({ projectId }).sort({ createdAt: 1 }).toArray();
  }

  async getAnalysis(id: string): Promise<Analysis | null> {
    return this.analyses().findOne({ id });
  }

  async updateAnalysis(id: string, updates: Partial<Analysis>): Promise<Analysis | null> {
    await this.analyses().updateOne({ id }, { $set: updates });
    return this.getAnalysis(id);
  }

  async addCreative(creative: Creative): Promise<Creative> {
    await this.creatives().insertOne(creative);
    return creative;
  }

  async listCreatives(projectId: string): Promise<Creative[]> {
    return this.creatives().find({ projectId }).sort({ createdAt: 1 }).toArray();
  }

  async getCreative(id: string): Promise<Creative | null> {
    return this.creatives().findOne({ id });
  }

  async updateCreative(id: string, updates: Partial<Creative>): Promise<Creative | null> {
    await this.creatives().updateOne({ id }, { $set: updates });
    return this.getCreative(id);
  }

  async addReport(report: Report): Promise<Report> {
    await this.reports().insertOne(report);
    return report;
  }

  async listReports(projectId: string): Promise<Report[]> {
    return this.reports().find({ projectId }).sort({ createdAt: 1 }).toArray();
  }

  async getReport(id: string): Promise<Report | null> {
    return this.reports().findOne({ id });
  }

  async updateReport(id: string, updates: Partial<Report>): Promise<Report | null> {
    await this.reports().updateOne({ id }, { $set: updates });
    return this.getReport(id);
  }

  async addJob(job: Job): Promise<Job> {
    await this.jobs().insertOne(job);
    return job;
  }

  async listJobs(projectId: string): Promise<Job[]> {
    return this.jobs().find({ projectId }).sort({ createdAt: 1 }).toArray();
  }

  async getJob(id: string): Promise<Job | null> {
    return this.jobs().findOne({ id });
  }

  async updateJob(id: string, updates: Partial<Job>): Promise<Job | null> {
    await this.jobs().updateOne({ id }, { $set: updates });
    return this.getJob(id);
  }
}

export const pipelineRepository = new PipelineRepository();
export type { PipelineRepository };
