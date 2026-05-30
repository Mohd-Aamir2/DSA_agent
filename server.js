import * as dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { pipeline } from "@xenova/transformers";
import { Pinecone } from "@pinecone-database/pinecone";
import ollama from "ollama";

const app = express();
app.use(cors({ origin: ["http://localhost:5173", "http://localhost:5174"] }));
app.use(express.json());

// Chat history (in-memory per session)
const History = [];

// Load embedding model once
console.log("Loading embedding model...");
const extractor = await pipeline("feature-extraction", "Xenova/bge-base-en-v1.5");
console.log("Embedding model ready ✅");

// Pinecone init
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME);

// Query rewriting
async function transformQuery(question) {
  const prompt = `Rewrite this as a complete standalone question. Return ONLY the question, nothing else.\n\nQuestion: ${question}`;
  const response = await ollama.chat({
    model: "deepseek-r1:1.5b",
    messages: [...History, { role: "user", content: prompt }],
  });
  return response.message.content.trim();
}

// Search Pinecone
async function searchDocuments(question) {
  const output = await extractor(question, { pooling: "mean", normalize: true });
  const vector = Array.from(output.data);
  const results = await pineconeIndex.query({ vector, topK: 5, includeMetadata: true });
  return results.matches;
}

// Ask AI
async function askAI(question, context) {
  const prompt = `You are a Data Structure and Algorithm Expert.
Answer ONLY from the context below. If not found, say:
"I could not find the answer in the provided document."

CONTEXT:
${context}

Question: ${question}`;

  History.push({ role: "user", content: question });

  const response = await ollama.chat({
    model: "deepseek-r1:1.5b",
    messages: [...History, { role: "user", content: prompt }],
  });

  const answer = response.message.content;
  History.push({ role: "assistant", content: answer });
  return answer;
}

// POST /api/chat
app.post("/api/chat", async (req, res) => {
  const { question } = req.body;
  if (!question?.trim()) {
    return res.status(400).json({ error: "Question is required" });
  }

  try {
    const standalone = await transformQuery(question);
    const results = await searchDocuments(standalone);

    if (!results.length) {
      return res.json({ answer: "No relevant results found in the document.", standalone });
    }

    const context = results
      .map((m) => m.metadata?.text || "")
      .join("\n\n---\n\n");

    const answer = await askAI(standalone, context);
    res.json({ answer, standalone });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get("/api/health", (_, res) => res.json({ status: "ok" }));

app.listen(5000, () => {
  console.log("Backend running at http://localhost:5000 🚀");
});