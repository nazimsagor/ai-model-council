// Core domain types shared between server and client.

export interface OpenRouterModel {
  id: string; // e.g. "openai/gpt-4o-mini"
  name: string;
  description: string;
  contextLength: number;
  pricing: {
    prompt: number; // USD per token
    completion: number; // USD per token
  };
  provider: string; // derived from id prefix, e.g. "openai"
  capabilities: {
    vision: boolean;
    tools: boolean;
    reasoning: boolean;
  };
}

export type CouncilMode = "fast" | "balanced" | "deep" | "maximum" | "custom";

export type Workflow = "chat" | "compare" | "council" | "auto";

export type PromptMode =
  | "standard"
  | "expert"
  | "research"
  | "coding"
  | "creative"
  | "decision";

export type ModelRunStatus =
  | "pending"
  | "streaming"
  | "complete"
  | "failed"
  | "timeout";

export interface ModelRunResult {
  modelId: string;
  provider: string;
  status: ModelRunStatus;
  content: string;
  error?: string;
  promptTokens?: number;
  completionTokens?: number;
  cost?: number;
  latencyMs?: number;
}

export interface EvaluationScores {
  accuracy: number;
  reasoning: number;
  completeness: number;
  relevance: number;
  clarity: number;
  technicalCorrectness: number;
  factualReliability: number;
  instructionFollowing: number;
  usefulness: number;
  originality: number;
}

export const EVALUATION_DIMENSIONS: (keyof EvaluationScores)[] = [
  "accuracy",
  "reasoning",
  "completeness",
  "relevance",
  "clarity",
  "technicalCorrectness",
  "factualReliability",
  "instructionFollowing",
  "usefulness",
  "originality",
];

export interface ModelEvaluation {
  modelId: string;
  judgeModelId: string;
  scores: EvaluationScores;
  total: number; // 0-100
  justification: string;
}

export interface DisagreementItem {
  topic: string;
  positions: { position: string; modelIds: string[] }[];
  councilConclusion: string;
}

export interface CouncilRunSummary {
  finalAnswer: string;
  whyChosen: string[];
  topModelIds: string[];
  confidence: number; // 0-100
  confidenceReason: string;
  disagreements: DisagreementItem[];
}

export interface CouncilRun {
  id: string;
  prompt: string;
  systemPrompt?: string;
  workflow: Workflow;
  mode: CouncilMode;
  promptMode: PromptMode;
  params: {
    temperature: number;
    maxTokens: number;
  };
  selectedModelIds: string[];
  judgeModelIds: string[];
  blindJudging: boolean;
  status: "running" | "complete" | "failed";
  createdAt: string;
  completedAt?: string;
  totalCost: number;
  totalTimeMs: number;
  results: ModelRunResult[];
  evaluations: ModelEvaluation[];
  summary?: CouncilRunSummary;
}

export type SSEEvent =
  | { type: "status"; modelId: string; status: ModelRunStatus }
  | { type: "delta"; modelId: string; text: string }
  | { type: "model_complete"; result: ModelRunResult }
  | { type: "evaluating" }
  | { type: "evaluation_complete"; evaluations: ModelEvaluation[] }
  | { type: "synthesizing" }
  | { type: "done"; runId: string; summary?: CouncilRunSummary; totalCost: number; totalTimeMs: number }
  | { type: "error"; message: string };
