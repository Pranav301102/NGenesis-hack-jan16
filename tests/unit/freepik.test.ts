import axios from 'axios';
import { FreepikGenerator } from '../../src/freepik';
import { mockFreepikCreateResponse, mockFreepikStatusResponse } from '../fixtures/mock-responses';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('FreepikGenerator', () => {
  let generator: FreepikGenerator;

  beforeEach(() => {
    jest.clearAllMocks();
    generator = new FreepikGenerator('test-api-key');
  });

  describe('generateAgentIcon', () => {
    it('should generate an icon and return the URL', async () => {
      // Mock the create request
      mockedAxios.post.mockResolvedValueOnce(mockFreepikCreateResponse);

      // Mock the status polling (completed on first check)
      mockedAxios.get.mockResolvedValueOnce(mockFreepikStatusResponse);

      const iconUrl = await generator.generateAgentIcon('Test icon prompt');

      expect(iconUrl).toBe('https://example.com/generated-icon.png');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/mystic'),
        expect.objectContaining({
          prompt: 'Test icon prompt',
          aspect_ratio: 'square_1_1',
          structure_strength: 40,
          resolution: '2048x2048'
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-freepik-api-key': 'test-api-key'
          })
        })
      );
    });

    it('should include style reference if provided', async () => {
      const styleUrl = 'https://example.com/style-ref.png';
      const generatorWithStyle = new FreepikGenerator('test-api-key', styleUrl);

      mockedAxios.post.mockResolvedValueOnce(mockFreepikCreateResponse);
      mockedAxios.get.mockResolvedValueOnce(mockFreepikStatusResponse);

      await generatorWithStyle.generateAgentIcon('Test prompt');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          style_reference: styleUrl
        }),
        expect.any(Object)
      );
    });

    it('should poll status until completion', async () => {
      mockedAxios.post.mockResolvedValueOnce(mockFreepikCreateResponse);

      // Mock multiple status checks (pending -> processing -> completed)
      mockedAxios.get
        .mockResolvedValueOnce({ data: { status: 'pending' } })
        .mockResolvedValueOnce({ data: { status: 'processing' } })
        .mockResolvedValueOnce(mockFreepikStatusResponse);

      const iconUrl = await generator.generateAgentIcon('Test prompt');

      expect(iconUrl).toBe('https://example.com/generated-icon.png');
      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
    });

    it('should throw error if generation fails', async () => {
      mockedAxios.post.mockResolvedValueOnce(mockFreepikCreateResponse);
      mockedAxios.get.mockResolvedValueOnce({
        data: { status: 'failed' }
      });

      await expect(generator.generateAgentIcon('Test prompt'))
        .rejects.toThrow('Image generation failed');
    });

    it('should timeout if generation takes too long', async () => {
      mockedAxios.post.mockResolvedValueOnce(mockFreepikCreateResponse);

      // Always return pending status
      mockedAxios.get.mockResolvedValue({
        data: { status: 'pending' }
      });

      await expect(generator.generateAgentIcon('Test prompt'))
        .rejects.toThrow('Image generation timeout');
    }, 65000); // Increase timeout for this test

    it('should allow setting style reference after construction', () => {
      const newStyleUrl = 'https://example.com/new-style.png';
      generator.setStyleReference(newStyleUrl);

      // This is a simple setter test - actual usage tested in other tests
      expect(generator['styleReferenceUrl']).toBe(newStyleUrl);
    });
  });
});
