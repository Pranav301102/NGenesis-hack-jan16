# AgentQL Documentation for AI Agent Generation

## What is AgentQL?

AgentQL is a natural language query language for web automation. Instead of brittle CSS or XPath selectors, you use semantic descriptions.

## Core Syntax

### Query Structure
```python
query = """
{
  element_name
  another_element
}
"""
```

### Natural Language Selectors
- Use descriptive names that match the element's PURPOSE, not its HTML structure
- Examples:
  - `search_input` - finds search boxes
  - `login_button` - finds login buttons
  - `product_price` - finds price elements
  - `article_title` - finds article headlines

### Python Integration

```python
import agentql
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = agentql.wrap(browser.new_page())
    page.goto("https://example.com")

    # Define query
    query = """
    {
      search_box
      search_button
    }
    """

    # Execute query
    elements = page.query_elements(query)

    # Interact with elements
    elements.search_box.type("your search term")
    elements.search_button.click()

    browser.close()
```

### Key Principles

1. **Self-Healing**: Queries work even if HTML structure changes
2. **Semantic**: Describe WHAT the element does, not its DOM path
3. **Cross-Site**: Same query works on similar websites
4. **Authenticated Content**: Works on logged-in pages and dynamic content

### Common Patterns

**Form Interaction:**
```python
{
  email_input
  password_input
  submit_button
}
```

**Data Extraction:**
```python
{
  product_name
  product_price
  product_rating
  add_to_cart_button
}
```

**Navigation:**
```python
{
  next_page_button
  menu_items
  dropdown_options
}
```

## CRITICAL RULES FOR CODE GENERATION

1. ALWAYS use `sync_playwright` (synchronous API), NEVER async
2. ALWAYS use `agentql.wrap()` on the page object
3. ALWAYS use descriptive, semantic names in queries
4. NEVER use CSS selectors like `.class` or `#id`
5. ALWAYS use `page.query_elements()` to execute queries
