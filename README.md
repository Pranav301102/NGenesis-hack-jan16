# NGenesis

## AI Agent Orchestration Platform That Handles Complex Workflows On-Demand With Just a Prompt

Transform natural language into powerful multi-tool AI workflows. NGenesis orchestrates web scraping, image generation, continuous monitoring, and data synthesis - all from a single prompt.

---

## Overview

**NGenesis** is an intelligent AI agent orchestration platform that automatically selects and coordinates multiple AI tools to accomplish complex tasks. Instead of manually chaining APIs and managing integrations, simply describe what you want - NGenesis handles the rest.

The platform features:
- **Smart Tool Selection**: AI automatically determines which tools (web scraping, image generation, monitoring) are needed for your task
- **Unified Orchestration**: Coordinates multiple tools with intelligent feedback loops and quality assessment
- **Web-Based Dashboard**: Modern UI for creating agents, monitoring execution, and viewing results
- **Excel Export**: Extract structured data from websites and export directly to spreadsheets
- **Continuous Monitoring**: Set up automated watches on websites with change alerts
- **Multi-Modal Outputs**: Generate reports, images, data extracts, and monitoring alerts - all in one workflow

---

## How It Works

### Architecture

NGenesis uses a multi-agent orchestration architecture powered by **Gemini 2.0 Flash** as the central reasoning engine:

```
User Prompt → Gemini Orchestrator → Tool Selection → Parallel Execution → Synthesis → Final Output
                                            ↓
                                    [TinyFish, Freepik, Yutori, ...]
```

### Core Components

#### 1. Gemini 2.0 Flash Orchestrator
- **Task Analysis**: Breaks down user intents into actionable steps
- **Tool Selection**: Automatically determines which integrations to use
- **Quality Assessment**: Evaluates outputs and decides if iteration is needed
- **Synthesis**: Combines results from multiple tools into coherent final output

#### 2. Web Scraping Engine (TinyFish/Mino API powered by AgentQL)
- **Self-Healing Selectors**: Automatically adapts to website structure changes
- **Natural Language Goals**: Describe what to extract without writing CSS selectors
- **Cloud-Based**: Serverless browser automation with zero infrastructure setup
- **JSON Output**: Returns structured data ready for processing or Excel export

**Example Usage:**
```javascript
// Simple prompt: "Extract the top 5 AI news headlines and summaries"
// NGenesis automatically:
// 1. Navigates to the target URL
// 2. Identifies headline elements using AI
// 3. Extracts titles, descriptions, and links
// 4. Returns structured JSON data
```

#### 3. Image Generation (Freepik Mystic API)
- **Context-Aware Generation**: Creates images based on scraped content or user prompts
- **Style Consistency**: Optional style reference URLs for brand-consistent visuals
- **Automatic Integration**: Generated images are linked in final reports

**Example Usage:**
```javascript
// When generating a blog post about AI trends:
// 1. Web scraper extracts latest AI news
// 2. Gemini analyzes key themes
// 3. Freepik generates relevant header image
// 4. Final output includes both text and visuals
```

#### 4. Continuous Monitoring (Yutori Scouts)
- **Change Detection**: Monitors websites for updates
- **Webhook Alerts**: Real-time notifications when changes occur
- **Scheduled Checks**: Configurable monitoring intervals
- **Scout Management**: Track all active monitoring tasks from dashboard

#### 5. Synthetic Data Generation (Tonic Fabricate)
- **Test Data Creation**: Generate realistic test datasets for development
- **Schema-Based**: Define data structure and let AI generate variations
- **Privacy-Safe**: Creates synthetic data that maintains statistical properties without exposing real data

#### 6. Code Quality Review (Macroscope)
- **Automated Code Review**: Analyzes generated agent code for quality
- **Best Practices**: Checks against coding standards
- **Quality Scoring**: Provides quantitative assessment of code quality

---

## Technology Stack

### AI & Orchestration
- **Gemini 2.0 Flash**: Central reasoning engine for task planning and synthesis
- **AgentQL/TinyFish/Mino**: Cloud-based web automation with self-healing selectors
- **Freepik Mystic API**: AI image generation for visual content
- **Yutori Scouts**: Continuous website monitoring
- **Tonic Fabricate**: Synthetic test data generation
- **Macroscope**: Automated code review and quality analysis

### Backend
- **Node.js + TypeScript**: Server runtime and type safety
- **Express.js**: REST API framework
- **Better SQLite3**: Local database for user data and agent history
- **JWT Authentication**: Secure user sessions
- **XLSX**: Excel file generation and parsing

### Frontend
- **Vanilla JavaScript**: Lightweight, no framework dependencies
- **CSS3**: Modern responsive design
- **Fetch API**: RESTful communication

### Development Tools
- **TypeScript Compiler**: Type checking and ES6+ to CommonJS compilation
- **Nodemon**: Hot reload during development
- **Playwright**: Browser automation (optional local execution)

---

## Key Features

### 1. Natural Language Orchestration
```
User: "Find the top 5 trending AI topics and create a summary report with a header image"

NGenesis:
→ Analyzes intent (web scraping + summarization + image generation)
→ Selects tools: TinyFish, Gemini, Freepik
→ Executes pipeline:
  Step 1: Scrapes AI news website
  Step 2: Summarizes top 5 topics with Gemini
  Step 3: Generates relevant header image with Freepik
→ Returns complete report with text + image
```

### 2. Smart Tool Selection
The platform includes an AI-powered tool selector that analyzes your request and automatically chooses the right integrations:

- **Web Scraping Tasks**: Automatically uses TinyFish/Mino for data extraction
- **Visual Content**: Activates Freepik when images are needed
- **Ongoing Tasks**: Engages Yutori for monitoring requirements
- **Testing Needs**: Leverages Fabricate for synthetic data

### 3. Multi-Tool Workflows
Execute complex pipelines with multiple tools working together:

```
Example: "Monitor TechCrunch for new AI articles and generate summary reports"

Pipeline:
1. TinyFish → Extracts latest articles
2. Gemini → Analyzes and summarizes content
3. Freepik → Creates illustration for report
4. Yutori → Sets up monitoring for new articles
5. Gemini → Synthesizes everything into final deliverable
```

### 4. Excel Export & Data Processing
Extract structured data from any website and export to Excel:

```javascript
// Endpoint: POST /api/scrape-to-excel
// Input: URL + Natural language goal
// Output: Excel file with extracted data

Example Request:
{
  "url": "https://example.com/products",
  "goal": "Extract all product names, prices, and ratings",
  "filename": "products_data"
}

// Returns: products_data_123456.xlsx
```

### 5. Feedback Loop & Quality Control
NGenesis implements a multi-iteration pipeline for quality assurance:

```
Iteration 1: Execute all tools in parallel
Iteration 2: Gemini evaluates outputs and identifies gaps
Iteration 3: (Optional) Refine outputs based on feedback
→ Final synthesis with completeness score
```

### 6. User Dashboard
Web-based interface for managing all your AI workflows:
- Create new agents with custom prompts
- View execution status and timeline
- Monitor active Yutori scouts
- Download Excel exports
- User authentication and history tracking

---

## API Endpoints

### Agent Creation & Orchestration

**Plan Generation**
```http
POST /genesis/plan
Content-Type: application/json

{
  "user_intent": "Extract pricing data from competitor website",
  "target_url": "https://example.com"
}
```

**Multi-Tool Orchestration**
```http
POST /genesis/orchestrate
Content-Type: application/json

{
  "user_intent": "Create a blog post about AI trends with images",
  "target_url": "https://techcrunch.com/ai",
  "selected_tools": ["tinyfish", "gemini", "freepik"]
}
```

**Agent Execution**
```http
POST /genesis
Content-Type: application/json

{
  "user_intent": "Monitor this page for price changes",
  "target_url": "https://example.com/product",
  "output_format": "json"
}
```

### Direct Tool Access

**Web Scraping**
```http
POST /api/tinyfish/run
Content-Type: application/json

{
  "url": "https://example.com",
  "goal": "Extract all product information"
}
```

**Image Generation**
```http
POST /api/freepik/generate
Content-Type: application/json

{
  "prompt": "Modern AI technology illustration, blue theme, 4K"
}
```

**Excel Export**
```http
POST /api/scrape-to-excel
Content-Type: application/json

{
  "url": "https://example.com",
  "goal": "Extract table data",
  "filename": "exported_data"
}
```

---

## Installation & Setup

### Prerequisites
- Node.js 16+ and npm
- Git

### Environment Variables
Create a `.env` file with your API keys:

```env
# Required
GEMINI_API_KEY=your_gemini_api_key
AGENTQL_API_KEY=your_agentql_api_key

# Optional (for full features)
FREEPIK_API_KEY=your_freepik_api_key
YUTORI_API_KEY=your_yutori_api_key
FABRICATE_API_KEY=your_fabricate_api_key
MACROSCOPE_API_KEY=your_macroscope_api_key

# Server Configuration
PORT=3000
WEBHOOK_URL=your_webhook_url_for_alerts
NGROK_AUTH_TOKEN=your_ngrok_token (optional, for public access)
```

### Installation Steps

```bash
# Clone repository
git clone <repository-url>
cd NGenesis-hack-jan16

# Install dependencies
npm install

# Build TypeScript
npm run build

# Start server
npm start

# Or run in development mode with hot reload
npm run dev
```

The dashboard will be available at `http://localhost:3000`

---

## Usage Examples

### Example 1: Competitive Analysis
```
Prompt: "Compare pricing for the top 5 products on this e-commerce site"
URL: https://example-store.com

Result:
- Extracts product names, prices, ratings
- Generates comparison table
- Exports to Excel
- Quality score: 9/10
```

### Example 2: Content Creation with Visuals
```
Prompt: "Create a blog post about the latest AI developments with a header image"
URL: https://techcrunch.com/category/artificial-intelligence/

Pipeline:
1. TinyFish scrapes latest AI articles
2. Gemini synthesizes key developments
3. Freepik generates blog header image
4. Final output: Complete blog post with visuals
```

### Example 3: Continuous Monitoring
```
Prompt: "Monitor this product page and alert me when price drops below $500"
URL: https://example.com/product/12345

Setup:
1. Creates Yutori scout
2. Checks page every hour
3. Sends webhook alert on price change
4. Automatically extracts current price
```

---

## Integration Details

### Freepik Image Generation

Freepik's Mystic API is used throughout NGenesis for generating contextual images:

**Use Cases:**
- Blog post header images based on article content
- Product visualization for scraped data
- Report illustrations matching data themes
- Custom agent icons and branding

**Implementation:**
```typescript
// FreepikGenerator class handles all image generation
const freepik = new FreepikGenerator(apiKey, styleReferenceUrl);

// Generate image from prompt
const imageUrl = await freepik.generateAgentIcon(
  "Modern tech illustration for AI article, blue theme, 4K quality"
);

// Image URL is returned and embedded in final output
```

**Features:**
- Automatic prompt enhancement based on context
- Style reference support for brand consistency
- High-quality 4K output
- Direct integration with orchestration pipeline

---

## Project Structure

```
NGenesis-hack-jan16/
├── src/
│   ├── index.ts                    # Main Express server
│   ├── orchestrator-enhanced.ts    # Core orchestration logic
│   ├── gemini.ts                   # Gemini AI integration
│   ├── tinyfish.ts                 # TinyFish/Mino web scraping
│   ├── freepik.ts                  # Freepik image generation
│   ├── yutori.ts                   # Yutori monitoring
│   ├── tonic-fabricate.ts          # Fabricate test data
│   ├── macroscope.ts               # Code review
│   ├── cline-wrapper.ts            # Cline integration
│   ├── db.ts                       # SQLite database
│   └── types.ts                    # TypeScript types
├── public/
│   ├── index.html                  # Web dashboard
│   ├── css/app.css                 # Styles
│   └── js/app.js                   # Frontend logic
├── data/                           # Database & Excel exports
├── templates/                      # Agent templates
├── package.json
├── tsconfig.json
└── .env                           # API keys (not in repo)
```

---

## Advanced Features

### Rate Limiting
Built-in Gemini API rate limiter respects free tier limits (15 req/min):
```typescript
// Automatically throttles requests
await geminiRateLimiter.throttle();
```

### Authentication
JWT-based user authentication with secure password hashing:
- User registration and login
- Protected endpoints
- Agent history per user
- Usage statistics tracking

### Error Handling
Comprehensive error handling with fallbacks:
- Tool failures don't break pipeline
- Demo results when tools unavailable
- Detailed error logging
- User-friendly error messages

### CORS Support
Configured for Retool and external integrations:
```typescript
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  // ... additional headers
});
```

---

## Roadmap

### Phase 1: Core Platform (Current)
- [x] Multi-tool orchestration
- [x] Web scraping with TinyFish/Mino
- [x] Image generation with Freepik
- [x] Excel export functionality
- [x] User authentication
- [x] Web dashboard

### Phase 2: Enhanced Intelligence (Planned)
- [ ] Learning from past executions
- [ ] Custom tool creation
- [ ] Advanced scheduling options
- [ ] Multi-step workflow builder
- [ ] Template marketplace

### Phase 3: Enterprise Features (Future)
- [ ] Team collaboration
- [ ] Role-based access control
- [ ] Webhook integrations
- [ ] API rate limit management
- [ ] Usage analytics dashboard

---

## Contributing

This project was created for a hackathon. Contributions, issues, and feature requests are welcome.

---

## License

This project is licensed under the ISC License.

---

## Acknowledgments

### Powered By:
- **Google Gemini 2.0 Flash** - AI reasoning and orchestration
- **AgentQL/TinyFish/Mino** - Self-healing web automation
- **Freepik Mystic API** - AI image generation
- **Yutori Scouts** - Continuous monitoring
- **Tonic Fabricate** - Synthetic data generation
- **Macroscope** - Code quality analysis

### Built For:
Hackathon 2026 - Demonstrating the power of multi-tool AI orchestration

---

## Support

For questions or issues:
- Open an issue on GitHub
- Check the API documentation at `/api/tools` endpoint
- Review the example tasks in the dashboard

---

**NGenesis** - Where AI agents come to life, orchestrated intelligently, executed flawlessly.
