import type { Db } from 'mongodb';
import type { Repositories } from '../routes';
import { projectRepository } from './project-repository';
import { pipelineRepository } from './pipeline-repository';

export { projectRepository } from './project-repository';
export { pipelineRepository } from './pipeline-repository';

export function createRepositories(_db: Db): Repositories {
  return {
    projects: {
      create: (project) => projectRepository.create(project),
      list: () => projectRepository.list(),
      getById: (id) => projectRepository.getById(id),
    },
    ingestions: {
      create: (ingestion) => pipelineRepository.addIngestion(ingestion),
      listByProject: (projectId) => pipelineRepository.listIngestions(projectId),
      getById: (id) => pipelineRepository.getIngestion(id),
    },
    normalizedSources: {
      create: (source) => pipelineRepository.addNormalizedSource(source),
      listByProject: (projectId) => pipelineRepository.listNormalizedSources(projectId),
      getById: (id) => pipelineRepository.getNormalizedSource(id),
    },
    analyses: {
      create: (analysis) => pipelineRepository.addAnalysis(analysis),
      listByProject: (projectId) => pipelineRepository.listAnalyses(projectId),
      getById: (id) => pipelineRepository.getAnalysis(id),
      update: (id, update) => pipelineRepository.updateAnalysis(id, update).then(() => undefined),
    },
    creatives: {
      create: (creative) => pipelineRepository.addCreative(creative),
      listByProject: (projectId) => pipelineRepository.listCreatives(projectId),
      getById: (id) => pipelineRepository.getCreative(id),
      update: (id, update) => pipelineRepository.updateCreative(id, update).then(() => undefined),
    },
    reports: {
      create: (report) => pipelineRepository.addReport(report),
      listByProject: (projectId) => pipelineRepository.listReports(projectId),
      getById: (id) => pipelineRepository.getReport(id),
      update: (id, update) => pipelineRepository.updateReport(id, update).then(() => undefined),
    },
    jobs: {
      create: (job) => pipelineRepository.addJob(job),
      listByProject: (projectId) => pipelineRepository.listJobs(projectId),
      getById: (id) => pipelineRepository.getJob(id),
      update: (id, update) => pipelineRepository.updateJob(id, update).then(() => undefined),
    },
  };
}
