import * as fs from 'fs';
import * as path from 'path';
import { ClineWrapper } from '../../src/cline-wrapper';
import { mockValidPythonCode, mockInvalidPythonCode } from '../fixtures/mock-responses';

// Mock child_process
jest.mock('child_process', () => ({
  exec: jest.fn()
}));

describe('ClineWrapper', () => {
  let cline: ClineWrapper;
  const testSandbox = path.resolve(__dirname, '../fixtures/test-sandbox');

  beforeEach(() => {
    cline = new ClineWrapper('../tests/fixtures/test-sandbox');

    // Create test sandbox directory
    if (!fs.existsSync(testSandbox)) {
      fs.mkdirSync(testSandbox, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testSandbox)) {
      fs.rmSync(testSandbox, { recursive: true, force: true });
    }
  });

  describe('writeFile', () => {
    it('should write a file to the agent directory', async () => {
      const filename = 'test_agent.py';
      const content = mockValidPythonCode;
      const agentDir = 'test_agent_001';

      const filePath = await cline.writeFile(filename, content, agentDir);

      expect(fs.existsSync(filePath)).toBe(true);
      const writtenContent = fs.readFileSync(filePath, 'utf-8');
      expect(writtenContent).toBe(content);
    });

    it('should create agent directory if it does not exist', async () => {
      const agentDir = 'new_agent_dir';
      const agentPath = path.join(testSandbox, agentDir);

      expect(fs.existsSync(agentPath)).toBe(false);

      await cline.writeFile('test.py', 'print("test")', agentDir);

      expect(fs.existsSync(agentPath)).toBe(true);
    });

    it('should return the full file path', async () => {
      const filename = 'agent.py';
      const agentDir = 'test_agent';

      const filePath = await cline.writeFile(filename, 'content', agentDir);

      expect(filePath).toContain(testSandbox);
      expect(filePath).toContain(agentDir);
      expect(filePath).toContain(filename);
    });
  });

  describe('createProductContext', () => {
    it('should create productContext.md file', async () => {
      const agentDir = 'test_agent_context';

      await cline.createProductContext(agentDir);

      const contextPath = path.join(testSandbox, agentDir, 'productContext.md');
      expect(fs.existsSync(contextPath)).toBe(true);

      const content = fs.readFileSync(contextPath, 'utf-8');
      expect(content).toContain('Golden Rules');
      expect(content).toContain('Meta-Genesis');
    });
  });

  describe('verifySyntax', () => {
    it('should return true for valid Python syntax', async () => {
      const { exec } = require('child_process');
      const { promisify } = require('util');

      // Mock successful py_compile
      exec.mockImplementation((cmd: string, callback: Function) => {
        callback(null, { stdout: '', stderr: '' });
      });

      const filePath = path.join(testSandbox, 'valid.py');
      fs.writeFileSync(filePath, mockValidPythonCode);

      const isValid = await cline.verifySyntax(filePath);

      expect(isValid).toBe(true);
    });

    it('should return false for invalid Python syntax', async () => {
      const { exec } = require('child_process');

      // Mock failed py_compile
      exec.mockImplementation((cmd: string, callback: Function) => {
        callback(new Error('SyntaxError'), { stdout: '', stderr: 'SyntaxError: invalid syntax' });
      });

      const filePath = path.join(testSandbox, 'invalid.py');
      fs.writeFileSync(filePath, mockInvalidPythonCode);

      const isValid = await cline.verifySyntax(filePath);

      expect(isValid).toBe(false);
    });

    it('should return true for non-Python files if they exist', async () => {
      const filePath = path.join(testSandbox, 'test.txt');
      fs.writeFileSync(filePath, 'test content');

      const isValid = await cline.verifySyntax(filePath);

      expect(isValid).toBe(true);
    });
  });

  describe('getAgentDirectory', () => {
    it('should return the correct agent directory path', () => {
      const agentName = 'my_agent';
      const dirPath = cline.getAgentDirectory(agentName);

      expect(dirPath).toContain(testSandbox);
      expect(dirPath).toContain(agentName);
    });
  });

  describe('executeAgent', () => {
    it('should execute a Python script and return stdout', async () => {
      const { exec } = require('child_process');

      // Mock successful execution
      exec.mockImplementation((cmd: string, options: any, callback: Function) => {
        callback(null, { stdout: 'Agent executed successfully', stderr: '' });
      });

      const filePath = path.join(testSandbox, 'agent.py');
      fs.writeFileSync(filePath, 'print("test")');

      const output = await cline.executeAgent(filePath);

      expect(output).toBe('Agent executed successfully');
    });

    it('should throw error if execution fails', async () => {
      const { exec } = require('child_process');

      // Mock failed execution
      exec.mockImplementation((cmd: string, options: any, callback: Function) => {
        callback(new Error('Execution failed'), { stdout: '', stderr: 'Error' });
      });

      const filePath = path.join(testSandbox, 'agent.py');
      fs.writeFileSync(filePath, 'invalid code');

      await expect(cline.executeAgent(filePath)).rejects.toThrow();
    });
  });
});
