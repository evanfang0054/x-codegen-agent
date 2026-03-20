export type Stage =
  | 'init'
  | 'research'
  | 'api-design'
  | 'ui-design'
  | 'integration'
  | 'validate'
  | 'deliver';

export type RunMode = 'step' | 'auto';
export type CheckStatus = 'pending' | 'passed' | 'failed';

export interface ReviewerGate {
  required: boolean;
  type: 'project-reviewer-subagent';
  message: string;
}

export interface ArtifactPolicy {
  finalCodeMdRequired: false;
  reviewReportRequired: false;
  message: string;
}

export interface IntegrityState {
  taskPlanHash: string | null;
  researchNotesHash: string | null;
}

export interface CheckState {
  status: CheckStatus;
  blocker: string | null;
  updatedAt: string | null;
}

export interface GateState {
  reviewer: ReviewerGate;
  artifactPolicy: ArtifactPolicy;
}

export interface XgenState {
  changeId: string;
  mode: RunMode;
  currentStage: Stage;
  completedStages: Stage[];
  reviewer: ReviewerGate;
  artifactPolicy: ArtifactPolicy;
  gates: GateState;
  checks: {
    review: CheckState;
  };
  integrity: IntegrityState;
  updatedAt: string;
}
