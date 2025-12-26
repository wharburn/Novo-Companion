# Web Search Feature

## Overview

NoVo now has access to real-time web search capabilities powered by Hume's built-in `web_search` tool. This allows NoVo to answer questions that require current information, facts, news, or any data that changes over time.

## How It Works

The web search tool is enabled via session settings when the EVI connection is established. NoVo will automatically use web search when:

- User asks for current events or news
- User requests real-time information (weather, stock prices, etc.)
- User asks factual questions that may require up-to-date data
- User explicitly asks NoVo to "search for" something

## Implementation Details

### Frontend (VoiceControl.tsx)

The web search tool is enabled in the `sendSessionSettings` call:

```typescript
socket.sendSessionSettings({
  systemPrompt: '...You have access to web_search tool...',
  builtinTools: [{ name: 'web_search' }],
});
```

When NoVo uses the web search tool, a visual indicator appears in the transcript: `🔍 Searching the web...`

### System Prompt

The system prompt has been updated to inform NoVo about the web_search capability:

> "When the user asks for current information, facts, news, or anything requiring real-time data, use the web_search tool to find accurate information."

## Usage Examples

**User:** "What's the weather like today?"  
**NoVo:** *Uses web_search* → Provides current weather information

**User:** "What's the latest news about AI?"  
**NoVo:** *Uses web_search* → Shares recent AI-related news

**User:** "Search for the best Italian restaurants nearby"  
**NoVo:** *Uses web_search* → Returns restaurant recommendations

## Technical Notes

- **Server-side tool**: Unlike `take_picture`, `web_search` is a built-in server tool that doesn't require client-side implementation
- **No additional API keys needed**: Web search is included with Hume EVI
- **Automatic invocation**: The supplemental LLM (configured in Hume Platform) determines when to call web_search based on user intent
- **Response integration**: Search results are automatically incorporated into NoVo's response

## Configuration Requirements

1. **Hume Config must have a supplemental LLM** that supports tool calling:
   - Claude (Anthropic)
   - GPT (OpenAI)
   - Gemini (Google)
   - Moonshot AI
   - Or custom LLM with OpenAI function calling spec

2. **Built-in tools are enabled dynamically** via `sendSessionSettings`, so no manual Hume Platform configuration is required

## Monitoring

Watch the browser console for:
- `🔧 Tool call: web_search` - When web search is invoked
- Full tool call details in the message logs

## Future Enhancements

- Add visual loading indicator during web search
- Display search query in transcript
- Show sources/citations from search results
- Allow user to configure search preferences
