import type {
  Analysis,
  Creative,
  Ingestion,
  Job,
  NormalizedSource,
  Project,
  Report,
} from './types';

class InMemoryStore {
  private projects: Project[] = [];
  private ingestions: Ingestion[] = [];
  private normalizedSources: NormalizedSource[] = [];
  private analyses: Analysis[] = [];
  private creatives: Creative[] = [];
  private reports: Report[] = [];
  private jobs: Job[] = [];

  addProject(project: Project) { this.projects.push(project); }
  listProjects() { return this.projects; }
  getProject(id: string) { return this.projects.find((project) => project.id === id); }

  addIngestion(ingestion: Ingestion) { this.ingestions.push(ingestion); }
  listIngestions(projectId: string) { return this.ingestions.filter((item) => item.projectId === projectId); }
  getIngestion(id: string) { return this.ingestions.find((item) => item.id === id); }

  addNormalizedSource(source: NormalizedSource) { this.normalizedSources.push(source); }
  listNormalizedSources(projectId: string) {
    return this.normalizedSources.filter((item) => item.projectId === projectId);
  }
  getNormalizedSource(id: string) { return this.normalizedSources.find((item) => item.id === id); }

  addAnalysis(analysis: Analysis) { this.analyses.push(analysis); }
  listAnalyses(projectId: string) { return this.analyses.filter((item) => item.projectId === projectId); }
  getAnalysis(id: string) { return this.analyses.find((analysis) => analysis.id === id); }

  addCreative(creative: Creative) { this.creatives.push(creative); }
  listCreatives(projectId: string) { return this.creatives.filter((item) => item.projectId === projectId); }
  getCreative(id: string) { return this.creatives.find((creative) => creative.id === id); }

  addReport(report: Report) { this.reports.push(report); }
  listReports(projectId: string) { return this.reports.filter((item) => item.projectId === projectId); }
  getReport(id: string) { return this.reports.find((report) => report.id === id); }

  addJob(job: Job) { this.jobs.push(job); }
  listJobs(projectId: string) { return this.jobs.filter((item) => item.projectId === projectId); }
  getJob(id: string) { return this.jobs.find((job) => job.id === id); }
}

export const store = new InMemoryStore();
