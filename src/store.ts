import type { Analysis, Ingestion, Project, Report } from './types';

class InMemoryStore {
  private projects: Project[] = [];
  private ingestions: Ingestion[] = [];
  private analyses: Analysis[] = [];
  private reports: Report[] = [];

  addProject(project: Project) { this.projects.push(project); }
  listProjects() { return this.projects; }
  getProject(id: string) { return this.projects.find((project) => project.id === id); }

  addIngestion(ingestion: Ingestion) { this.ingestions.push(ingestion); }
  listIngestions(projectId: string) { return this.ingestions.filter((item) => item.projectId === projectId); }

  addAnalysis(analysis: Analysis) { this.analyses.push(analysis); }
  listAnalyses(projectId: string) { return this.analyses.filter((item) => item.projectId === projectId); }
  getAnalysis(id: string) { return this.analyses.find((analysis) => analysis.id === id); }

  addReport(report: Report) { this.reports.push(report); }
  listReports(projectId: string) { return this.reports.filter((item) => item.projectId === projectId); }
  getReport(id: string) { return this.reports.find((report) => report.id === id); }
}

export const store = new InMemoryStore();

