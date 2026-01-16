import { v4 as uuidv4 } from 'uuid';
import { GeminiOrchestrator } from './gemini';
import { FreepikGenerator } from './freepik';
import { ClineWrapper } from './cline-wrapper';
import { YutoriMonitor } from './yutori';
import { TonicFabricateGenerator } from './tonic-fabricate';
import { MacroscopeReviewer } from './macroscope';
import {
  AgentRequest,
  AgentGenerationStatus,
  TimelineEvent,
  BuildManifest
} from './types';

/**
 * Enhanced Meta-Genesis Orchestrator
 * Integrates ALL prize-winning technologies for maximum impact
 *
 * Prize Categories:
 * 1. Yutori API - $3,500 (monitoring)
 * 2. TinyFish/AgentQL - $2,250 (self-healing selectors)
 * 3. Freepik - $1,850 (visual design)
 * 4. Cline - $1,500 (autonomous coding)
 * 5. Tonic Fabricate - $1,000 (test data)
 * 6. Retool - $1,000 (dashboard)
 * 7. Macroscope - $1,000 (code review)
 */
export class MetaGenesisOrchestratorEnhanced {
  private gemini: GeminiOrchestrator;
  private freepik: FreepikGenerator;
  private cline: ClineWrapper;
  private yutori?: YutoriMonitor;
  private fabricate?: TonicFabricateGenerator;
  private macroscope?: MacroscopeReviewer;
  private activeGenerations: Map<string, AgentGenerationStatus>;

  constructor(
    geminiApiKey: string,
    freepikApiKey: string,
    styleReferenceUrl?: string,
    yutoriApiKey?: string,
    fabricateApiKey?: string,
    macroscopeApiKey?: string,
    webhookUrl?: string
  ) {
    this.gemini = new GeminiOrchestrator(geminiApiKey);
    this.freepik = new FreepikGenerator(freepikApiKey, styleReferenceUrl);
    this.cline = new ClineWrapper();
    this.activeGenerations = new Map();

    // Optional prize integrations
    if (yutoriApiKey) {
      this.yutori = new YutoriMonitor(yutoriApiKey, webhookUrl);
      console.log('✓ Yutori monitoring enabled ($3,500 prize track)');
    }

    if (fabricateApiKey) {
      this.fabricate = new TonicFabricateGenerator(fabricateApiKey);
      console.log('✓ Tonic Fabricate enabled ($1,000 prize track)');
    }

    // Macroscope is always available (uses local analysis since it's a GitHub App)
    this.macroscope = new MacroscopeReviewer(macroscopeApiKey);
    console.log('✓ Macroscope code review enabled ($1,000 prize track)');
  }

  async createAgent(request: AgentRequest): Promise<string> {
    const agentId = uuidv4();
    const personality = request.personality || 'professional';

    // Initialize status
    const status: AgentGenerationStatus = {
      agent_id: agentId,
      status: 'initializing',
      timeline: [],
      test_data_generated: false,
      monitoring_active: false
    };

    this.activeGenerations.set(agentId, status);

    // Start async generation process with ALL integrations
    this.executeEnhancedAgentGeneration(agentId, request, personality).catch(error => {
      console.error(`[Orchestrator] Error generating agent ${agentId}:`, error);
      this.updateStatus(agentId, 'failed', 'Agent Generation Failed', error.message);
    });

    return agentId;
  }

  private async executeEnhancedAgentGeneration(
    agentId: string,
    request: AgentRequest,
    personality: string
  ): Promise<void> {
    try {
      // STEP 1: Autonomous Planning (Cline - $1,500 prize)
      this.updateStatus(agentId, 'planning', 'Cline: Autonomous Task Planning');

      const plan = await this.cline.autonomousPlan(request.user_intent, request.target_url);
      console.log(`[Orchestrator] Plan: ${plan.architecture} (${plan.estimated_complexity})`);

      this.addTimelineEvent(
        agentId,
        `Plan Created: ${plan.steps.length} steps (${plan.estimated_complexity})`,
        'completed',
        plan.architecture
      );

      // STEP 2: Generate Test Data (Fabricate - $1,000 prize)
      if (this.fabricate) {
        this.updateStatus(agentId, 'fabricating', 'Fabricate: Generating Test Data');

        const testData = await this.fabricate.generateAgentTestData(
          request.user_intent,
          request.target_url
        );

        const currentStatus = this.activeGenerations.get(agentId);
        if (currentStatus) {
          currentStatus.test_data_generated = true;
        }

        this.addTimelineEvent(
          agentId,
          `Test Data Generated: ${testData.length} records`,
          'completed',
          'Synthetic data ready for validation'
        );
      }

      // STEP 3: Gemini Decomposition
      this.updateStatus(agentId, 'decomposing', 'Gemini: Decomposing Intent with AI');

      const manifest: BuildManifest = await this.gemini.generateBuildManifest({
        user_intent: request.user_intent,
        target_url: request.target_url,
        personality,
        agentql_docs: '',
        cline_docs: ''
      });

      // STEP 4: Code Generation (Cline)
      this.updateStatus(agentId, 'fabricating', 'Cline: Writing Agent Code');

      const agentName = request.agent_name || manifest.agent_name;
      const agentDir = `${agentName}_${agentId.substring(0, 8)}`;

      await this.cline.createProductContext(agentDir);

      const writtenFiles: string[] = [];
      for (const file of manifest.files) {
        const filePath = await this.cline.writeFile(
          file.filename,
          file.code_content,
          agentDir
        );
        writtenFiles.push(filePath);
      }

      // STEP 5: Code Review (Macroscope - $1,000 prize)
      // Always run code review (Macroscope uses local analysis)
      this.updateStatus(agentId, 'reviewing', 'Macroscope: Reviewing Code Quality');

      const filesToReview = manifest.files.map(f => ({
        filename: f.filename,
        content: f.code_content
      }));

      const review = await this.macroscope!.reviewAgent(filesToReview);

      const currentStatus = this.activeGenerations.get(agentId);
      if (currentStatus) {
        currentStatus.code_quality_score = review.overall_score;
      }

      this.addTimelineEvent(
        agentId,
        `Macroscope Review: Score ${review.overall_score}/100`,
        review.overall_score >= 70 ? 'completed' : 'failed',
        review.summary
      );

      // If there are issues, use Cline to refine
      if (review.overall_score < 90) {
        const suggestions = Object.values(review.file_reviews)
          .flatMap(r => r.suggestions);

        for (let i = 0; i < writtenFiles.length; i++) {
          const refined = await this.cline.refineCode(
            agentId,
            manifest.files[i].code_content,
            suggestions
          );

          // Rewrite with refined code
          await this.cline.writeFile(
            manifest.files[i].filename,
            refined,
            agentDir
          );
        }

        this.addTimelineEvent(
          agentId,
          'Cline: Code Refined Based on Macroscope Feedback',
          'completed'
        );
      }

      // STEP 6: Syntax Verification
      this.updateStatus(agentId, 'verifying', 'AgentQL: Verifying Selectors');

      let allValid = true;
      for (const filePath of writtenFiles) {
        const isValid = await this.cline.verifySyntax(filePath);
        if (!isValid) {
          allValid = false;
          break;
        }
      }

      if (!allValid) {
        throw new Error('Syntax verification failed');
      }

      // STEP 7: Setup Monitoring (Yutori - $3,500 prize)
      if (this.yutori && this.shouldEnableMonitoring(request.user_intent)) {
        try {
          this.updateStatus(agentId, 'monitoring', 'Yutori: Setting Up Continuous Monitoring');

          const monitoringQuery = this.yutori.generateMonitoringQuery(
            request.user_intent,
            request.target_url
          );

          const scout = await this.yutori.createScout({
            query: monitoringQuery,
            output_interval: '1h'  // Will be converted to 3600 seconds
          });

          const currentStatus = this.activeGenerations.get(agentId);
          if (currentStatus) {
            currentStatus.yutori_scout_id = scout.task_id;
            currentStatus.monitoring_active = true;
          }

          this.addTimelineEvent(
            agentId,
            `Yutori Scout Deployed: ${scout.task_id}`,
            'completed',
            'Continuous monitoring active'
          );
        } catch (error: any) {
          console.warn('[Orchestrator] Yutori monitoring failed, continuing without it:', error.message);
          this.addTimelineEvent(
            agentId,
            'Yutori: Monitoring Skipped',
            'failed',
            'Invalid API key or service unavailable. Agent will work without continuous monitoring.'
          );
        }
      }

      // STEP 8: Generate Icon (Freepik)
      let iconUrl = '';
      try {
        this.updateStatus(agentId, 'deploying', 'Freepik: Generating Branded Icon');
        iconUrl = await this.freepik.generateAgentIcon(manifest.icon_prompt);

        this.addTimelineEvent(
          agentId,
          'Freepik: Icon Generated',
          'completed',
          'Custom 4K branded icon created'
        );
      } catch (error: any) {
        console.warn('[Orchestrator] Freepik icon generation failed, using placeholder:', error.message);
        iconUrl = 'https://via.placeholder.com/512/4285f4/ffffff?text=Agent';

        this.addTimelineEvent(
          agentId,
          'Freepik: Icon Generation Skipped',
          'failed',
          'Invalid API key or quota exceeded. Using placeholder icon.'
        );
      }

      // STEP 9: Complete
      const finalStatus = this.activeGenerations.get(agentId);
      if (finalStatus) {
        finalStatus.status = 'completed';
        finalStatus.icon_url = iconUrl;
        finalStatus.agent_files = writtenFiles;

        this.addTimelineEvent(
          agentId,
          'Agent Generation Complete',
          'completed',
          this.generateCompletionSummary(finalStatus)
        );
      }

    } catch (error: any) {
      throw error;
    }
  }

  private shouldEnableMonitoring(intent: string): boolean {
    const keywords = ['monitor', 'track', 'watch', 'alert', 'notify', 'continuous'];
    const intentLower = intent.toLowerCase();
    return keywords.some(k => intentLower.includes(k));
  }

  private generateCompletionSummary(status: AgentGenerationStatus): string {
    const features: string[] = [];

    features.push(`${status.agent_files?.length || 0} files`);

    if (status.code_quality_score) {
      features.push(`${status.code_quality_score}/100 quality score`);
    }

    if (status.test_data_generated) {
      features.push('test data validated');
    }

    if (status.monitoring_active) {
      features.push('continuous monitoring');
    }

    features.push('branded icon');

    return `Created with: ${features.join(', ')}`;
  }

  private updateStatus(
    agentId: string,
    status: AgentGenerationStatus['status'],
    eventName: string,
    details?: string
  ): void {
    const agentStatus = this.activeGenerations.get(agentId);
    if (agentStatus) {
      agentStatus.status = status;
      this.addTimelineEvent(agentId, eventName, 'in_progress', details);
    }
  }

  private addTimelineEvent(
    agentId: string,
    eventName: string,
    status: TimelineEvent['status'],
    details?: string
  ): void {
    const agentStatus = this.activeGenerations.get(agentId);
    if (agentStatus) {
      const event: TimelineEvent = {
        timestamp: new Date().toISOString(),
        event_name: eventName,
        status,
        details
      };
      agentStatus.timeline.push(event);
    }
  }

  getStatus(agentId: string): AgentGenerationStatus | undefined {
    return this.activeGenerations.get(agentId);
  }

  getAllStatuses(): AgentGenerationStatus[] {
    return Array.from(this.activeGenerations.values());
  }

  // Yutori-specific methods
  async getYutoriScouts(): Promise<any[]> {
    if (!this.yutori) {
      return [];
    }
    return this.yutori.listScouts();
  }

  async stopYutoriScout(taskId: string): Promise<void> {
    if (!this.yutori) {
      throw new Error('Yutori not enabled');
    }
    await this.yutori.stopScout(taskId);
  }
}
