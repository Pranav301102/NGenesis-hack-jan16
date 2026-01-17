import axios from 'axios';

export interface CodeReviewResult {
  score: number; // 0-100
  issues: CodeIssue[];
  suggestions: string[];
  complexity: 'low' | 'medium' | 'high';
  maintainability: number;
}

export interface CodeIssue {
  severity: 'error' | 'warning' | 'info';
  line?: number;
  message: string;
  category: 'syntax' | 'security' | 'performance' | 'style';
}

/**
 * Macroscope Integration - AI-powered code review
 *
 * NOTE: Macroscope is a GitHub App, not a REST API.
 * For demo purposes, we use local analysis + can demo GitHub App integration
 */
export class MacroscopeReviewer {
  private apiKey: string;
  private baseUrl = 'https://api.macroscope.com/v1';
  private useLocalAnalysis: boolean = true; // GitHub App doesn't expose REST API

  constructor(apiKey?: string) {
    this.apiKey = apiKey || 'local-analyzer';
    // If no API key, use local analysis (which is what we should do anyway)
    this.useLocalAnalysis = !apiKey || apiKey === 'local-analyzer';
  }

  /**
   * Review generated agent code for quality and issues
   * Uses local analysis since Macroscope is a GitHub App
   */
  async reviewCode(code: string, filename: string): Promise<CodeReviewResult> {
    console.log('[Macroscope] Reviewing code:', filename);

    // Macroscope is a GitHub App - use local analysis for hackathon
    // In production, this would be triggered by pushing to GitHub
    console.log('[Macroscope] Using local code analysis (Macroscope GitHub App reviews PRs automatically)');
    return this.analyzeCodeLocally(code, filename);
  }

  /**
   * Analyze multiple files for a complete agent review
   */
  async reviewAgent(files: { filename: string; content: string }[]): Promise<{
    overall_score: number;
    file_reviews: Record<string, CodeReviewResult>;
    summary: string;
  }> {
    console.log('[Macroscope] Reviewing agent with', files.length, 'files');

    const fileReviews: Record<string, CodeReviewResult> = {};
    let totalScore = 0;

    for (const file of files) {
      const review = await this.reviewCode(file.content, file.filename);
      fileReviews[file.filename] = review;
      totalScore += review.score;
    }

    const overallScore = files.length > 0 ? totalScore / files.length : 0;

    return {
      overall_score: Math.round(overallScore),
      file_reviews: fileReviews,
      summary: this.generateSummary(overallScore, fileReviews)
    };
  }

  /**
   * Local code analysis (fallback)
   */
  private analyzeCodeLocally(code: string, filename: string): CodeReviewResult {
    const issues: CodeIssue[] = [];
    let score = 100;

    // Check for common issues
    if (code.includes('eval(')) {
      issues.push({
        severity: 'error',
        message: 'Use of eval() is a security risk',
        category: 'security'
      });
      score -= 20;
    }

    if (!code.includes('try') && !code.includes('except')) {
      issues.push({
        severity: 'warning',
        message: 'Missing error handling',
        category: 'style'
      });
      score -= 10;
    }

    if (code.length > 5000) {
      issues.push({
        severity: 'info',
        message: 'File is very long, consider breaking into modules',
        category: 'style'
      });
      score -= 5;
    }

    // Check for AgentQL best practices
    if (filename.endsWith('.py') && code.includes('agentql')) {
      if (!code.includes('sync_playwright')) {
        issues.push({
          severity: 'warning',
          message: 'Should use sync_playwright for AgentQL',
          category: 'style'
        });
        score -= 10;
      }

      if (!code.includes('wait_for_load_state')) {
        issues.push({
          severity: 'info',
          message: 'Consider adding wait_for_load_state for reliability',
          category: 'performance'
        });
        score -= 5;
      }
    }

    // Determine complexity
    const complexity = this.calculateComplexity(code);

    return {
      score: Math.max(0, score),
      issues,
      suggestions: this.generateSuggestions(issues),
      complexity,
      maintainability: Math.max(0, score)
    };
  }

  /**
   * Calculate code complexity
   */
  private calculateComplexity(code: string): 'low' | 'medium' | 'high' {
    const lines = code.split('\n').length;
    const cyclomaticIndicators = (code.match(/\b(if|for|while|and|or)\b/g) || []).length;

    if (lines > 300 || cyclomaticIndicators > 20) return 'high';
    if (lines > 150 || cyclomaticIndicators > 10) return 'medium';
    return 'low';
  }

  /**
   * Generate suggestions from issues
   */
  private generateSuggestions(issues: CodeIssue[]): string[] {
    const suggestions: string[] = [];

    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;

    if (errorCount > 0) {
      suggestions.push(`Fix ${errorCount} critical error(s) before deployment`);
    }

    if (warningCount > 0) {
      suggestions.push(`Address ${warningCount} warning(s) to improve code quality`);
    }

    const securityIssues = issues.filter(i => i.category === 'security');
    if (securityIssues.length > 0) {
      suggestions.push('Review security issues immediately');
    }

    if (issues.length === 0) {
      suggestions.push('Code looks good! Ready for deployment');
    }

    return suggestions;
  }

  /**
   * Generate summary from review
   */
  private generateSummary(score: number, reviews: Record<string, CodeReviewResult>): string {
    if (score >= 90) {
      return 'Excellent code quality. Agent is production-ready.';
    } else if (score >= 75) {
      return 'Good code quality. Minor improvements recommended.';
    } else if (score >= 60) {
      return 'Acceptable code quality. Several improvements needed.';
    } else {
      return 'Code quality needs significant improvement before deployment.';
    }
  }

  /**
   * Detect language from filename
   */
  private detectLanguage(filename: string): string {
    if (filename.endsWith('.py')) return 'python';
    if (filename.endsWith('.js') || filename.endsWith('.ts')) return 'javascript';
    if (filename.endsWith('.java')) return 'java';
    return 'unknown';
  }

  /**
   * Parse Macroscope API response
   */
  private parseReviewResponse(data: any): CodeReviewResult {
    return {
      score: data.score || 0,
      issues: data.issues || [],
      suggestions: data.suggestions || [],
      complexity: data.complexity || 'medium',
      maintainability: data.maintainability || 0
    };
  }
}
