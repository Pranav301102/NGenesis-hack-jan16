import { GeminiOrchestrator } from '../../src/gemini';
import { mockAgentRequest, mockBuildManifest, mockGeminiResponse } from '../fixtures/mock-responses';

// Mock the Google Generative AI module
jest.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: jest.fn().mockResolvedValue(mockGeminiResponse)
      })
    }))
  };
});

describe('GeminiOrchestrator', () => {
  let orchestrator: GeminiOrchestrator;

  beforeEach(() => {
    orchestrator = new GeminiOrchestrator('test-api-key');
  });

  describe('generateBuildManifest', () => {
    it('should generate a valid build manifest from user intent', async () => {
      const context = {
        user_intent: mockAgentRequest.user_intent,
        target_url: mockAgentRequest.target_url,
        personality: 'professional',
        agentql_docs: '',
        cline_docs: ''
      };

      const manifest = await orchestrator.generateBuildManifest(context);

      expect(manifest).toBeDefined();
      expect(manifest.agent_name).toBe('amazon_price_tracker');
      expect(manifest.description).toBe('Tracks product prices on Amazon');
      expect(manifest.files).toHaveLength(1);
      expect(manifest.files[0].filename).toBe('amazon_price_tracker.py');
      expect(manifest.files[0].file_type).toBe('python');
      expect(manifest.agentql_queries).toBeDefined();
      expect(manifest.icon_prompt).toBeDefined();
    });

    it('should include AgentQL queries in the manifest', async () => {
      const context = {
        user_intent: 'Scrape product data',
        target_url: 'https://example.com',
        personality: 'professional',
        agentql_docs: '',
        cline_docs: ''
      };

      const manifest = await orchestrator.generateBuildManifest(context);

      expect(manifest.agentql_queries).toBeDefined();
      expect(manifest.agentql_queries.main_query).toBeDefined();
    });

    it('should generate icon prompt for visual branding', async () => {
      const context = {
        user_intent: 'Monitor website changes',
        target_url: 'https://example.com',
        personality: 'professional',
        agentql_docs: '',
        cline_docs: ''
      };

      const manifest = await orchestrator.generateBuildManifest(context);

      expect(manifest.icon_prompt).toBeDefined();
      expect(typeof manifest.icon_prompt).toBe('string');
      expect(manifest.icon_prompt.length).toBeGreaterThan(10);
    });

    it('should throw error if JSON extraction fails', async () => {
      // Mock a response without valid JSON
      const badResponse = {
        response: {
          text: () => 'This is not valid JSON at all'
        }
      };

      const { GoogleGenerativeAI } = require('@google/generative-ai');
      GoogleGenerativeAI.mockImplementationOnce(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: jest.fn().mockResolvedValue(badResponse)
        })
      }));

      const newOrchestrator = new GeminiOrchestrator('test-api-key');
      const context = {
        user_intent: 'Test',
        target_url: 'https://example.com',
        personality: 'professional',
        agentql_docs: '',
        cline_docs: ''
      };

      await expect(newOrchestrator.generateBuildManifest(context))
        .rejects.toThrow('Failed to extract JSON from Gemini response');
    });
  });
});
