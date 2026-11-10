// Drop-in shim: exposes the same shape as Anthropic's `client.messages.create()`
// so every existing route (content.js, draft.js) works unchanged — only the
// `require`/`new Anthropic(...)` line at the top of each route file needs to
// swap for `require('../lib/gemini')`. Everything below just translates the
// Anthropic request/response shape to Gemini's and back.
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Both Claude models used in this app map to Gemini Flash (cheap + fast).
// Bump to 'gemini-2.5-pro' here if a specific endpoint needs higher quality.
const MODEL_MAP = {
  'claude-haiku-4-5-20251001': 'gemini-2.5-flash',
  'claude-sonnet-4-6': 'gemini-2.5-flash',
};

function toParts(content) {
  if (typeof content === 'string') return [{ text: content }];
  return content.map((block) => {
    if (block.type === 'image') {
      return { inlineData: { mimeType: block.source.media_type, data: block.source.data } };
    }
    return { text: block.text };
  });
}

async function create({ model, system, messages, max_tokens }) {
  const res = await ai.models.generateContent({
    model: MODEL_MAP[model] || 'gemini-2.5-flash',
    contents: messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: toParts(m.content),
    })),
    config: {
      systemInstruction: system,
      maxOutputTokens: max_tokens,
      // These routes all want plain/JSON text back, not Gemini's internal
      // "thinking" tokens — without this some responses come back empty.
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  // Reshaped to match Anthropic's response: response.content[0].text
  return { content: [{ text: res.text }] };
}

module.exports = { messages: { create } };
