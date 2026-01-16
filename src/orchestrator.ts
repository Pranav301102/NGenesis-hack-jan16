import { v4 as uuidv4 } from 'uuid';
import { GeminiOrchestrator } from './gemini';
import { FreepikGenerator } from './freepik';
import { ClineWrapper } from './cline-wrapper';
import {
  AgentRequest,
  AgentGenerationStatus,
  TimelineEvent,
  BuildManifest
} from './types';

export class MetaGenesisOrchestrator {
  private gemini: GeminiOrchestrator;
  private freepik: FreepikGenerator;
  private cline: ClineWrapper;
  private activeGenerations: Map<string, AgentGenerationStatus>;

  constructor(
    geminiApiKey: string,
    freepikApiKey: string,
    styleReferenceUrl?: string
  ) {
    this.gemini = new GeminiOrchestrator(geminiApiKey);
    this.freepik = new FreepikGenerator(freepikApiKey, styleReferenceUrl);
    this.cline = new ClineWrapper();
    this.activeGenerations = new Map();
  }

  async createAgent(request: AgentRequest): Promise<string> {
    const agentId = uuidv4();
    const personality = request.personality || 'professional';

    // Initialize status
    const status: AgentGenerationStatus = {
      agent_id: agentId,
      status: 'initializing',
      timeline: []
    };

    this.activeGenerations.set(agentId, status);

    // Start async generation process
    this.executeAgentGeneration(agentId, request, personality).catch(error => {
      console.error(`[Orchestrator] Error generating agent ${agentId}:`, error);
      this.updateStatus(agentId, 'failed', 'Agent Generation Failed', error.message);
    });

    return agentId;
  }

  private async executeAgentGeneration(
    agentId: string,
    request: AgentRequest,
    personality: string
  ): Promise<void> {
    try {
      // Step 1: Decomposition
      this.updateStatus(agentId, 'decomposing', 'Gemini: Decomposing Intent');

      const manifest: BuildManifest = await this.gemini.generateBuildManifest({
        user_intent: request.user_intent,
        target_url: request.target_url,
        personality,
        agentql_docs: '',
        cline_docs: ''
      });

      // Step 2: Fabrication
      this.updateStatus(agentId, 'fabricating', 'Cline: Writing Agent Code');

      const agentName = request.agent_name || manifest.agent_name;
      const agentDir = `${agentName}_${agentId.substring(0, 8)}`;

      // Create product context
      await this.cline.createProductContext(agentDir);

      // Write files
      const writtenFiles: string[] = [];
      for (const file of manifest.files) {
        const filePath = await this.cline.writeFile(
          file.filename,
          file.code_content,
          agentDir
        );
        writtenFiles.push(filePath);
      }

      // Step 3: Verification
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

      // Step 4: Generate Icon (parallel with deployment prep)
      this.updateStatus(agentId, 'deploying', 'Freepik: Generating Agent Icon');

      const iconUrl = await this.freepik.generateAgentIcon(manifest.icon_prompt);

      // Update final status
      const finalStatus = this.activeGenerations.get(agentId);
      if (finalStatus) {
        finalStatus.status = 'completed';
        finalStatus.icon_url = iconUrl;
        finalStatus.agent_files = writtenFiles;

        this.addTimelineEvent(agentId, 'Agent Generation Complete', 'completed',
          `Created ${writtenFiles.length} files with custom icon`);
      }

    } catch (error: any) {
      throw error;
    }
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
}
