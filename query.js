import * as dotenv from "dotenv";
dotenv.config();

import readlineSync from "readline-sync";

import { pipeline } from "@xenova/transformers";

import { Pinecone } from "@pinecone-database/pinecone";

import ollama from "ollama";

// ========================================
// CHAT HISTORY
// ========================================
const History = [];

// ========================================
// LOAD EMBEDDING MODEL ONCE
// ========================================
console.log("Loading embedding model...");

const extractor = await pipeline(
  "feature-extraction",
  "Xenova/bge-base-en-v1.5"
);

console.log("Embedding model loaded");

// ========================================
// PINECONE INIT
// ========================================
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const pineconeIndex = pinecone.Index(
  process.env.PINECONE_INDEX_NAME
);

// ========================================
// QUERY REWRITING
// ========================================
async function transformQuery(question) {

  const prompt = `
You are a query rewriting expert.

Based on the previous conversation, rewrite the follow-up question into a complete standalone question.

Rules:
- Only return the rewritten question
- No explanation
- No extra text

User Question:
${question}
`;

  const response = await ollama.chat({
    model: "deepseek-r1:1.5b",

    messages: [
      ...History,
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  return response.message.content.trim();
}

// ========================================
// CREATE EMBEDDING
// ========================================
async function createEmbedding(text) {

  const output = await extractor(text, {
    pooling: "mean",
    normalize: true,
  });

  return Array.from(output.data);
}

// ========================================
// SEARCH DOCUMENTS
// ========================================
async function searchDocuments(question) {

  const queryVector = await createEmbedding(question);

  const searchResults = await pineconeIndex.query({
    vector: queryVector,
    topK: 5,
    includeMetadata: true,
  });

  return searchResults.matches;
}

// ========================================
// ASK AI
// ========================================
async function askAI(question, context) {

  const prompt = `
You are a Data Structure and Algorithm Expert.

You will receive:
1. User Question
2. Relevant Context from documents

Rules:
- Answer ONLY from the provided context
- If answer is missing, say:
  "I could not find the answer in the provided document."
- Keep answers simple and educational

================ CONTEXT ================

${context}

=========================================

Question:
${question}
`;

  // Save user question
  History.push({
    role: "user",
    content: question,
  });

  const response = await ollama.chat({
    model: "deepseek-r1:1.5b",

    messages: [
      ...History,
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const answer = response.message.content;

  // Save assistant response
  History.push({
    role: "assistant",
    content: answer,
  });

  return answer;
}

// ========================================
// MAIN CHAT LOOP
// ========================================
async function main() {

  while (true) {

    const userQuestion = readlineSync.question(
      "\nAsk me anything --> "
    );

    // Exit condition
    if (
      userQuestion.toLowerCase() === "exit" ||
      userQuestion.toLowerCase() === "quit"
    ) {
      console.log("Goodbye 👋");
      process.exit(0);
    }

    try {

      console.log("\nTransforming query...\n");

      // Rewrite follow-up question
      const standaloneQuestion = await transformQuery(userQuestion);

      console.log("Standalone Question:");
      console.log(standaloneQuestion);

      console.log("\nSearching documents...\n");

      // Search Pinecone
      const results = await searchDocuments(standaloneQuestion);

      if (!results.length) {
        console.log("No relevant results found.");
        continue;
      }

      // Build context
      const context = results
        .map((match) => match.metadata?.text || "")
        .join("\n\n-----------------\n\n");

      // Generate answer
      const answer = await askAI(
        standaloneQuestion,
        context
      );

      console.log("\n============= AI RESPONSE =============\n");

      console.log(answer);

      console.log("\n=======================================\n");

    } catch (error) {

      console.error("\nError:", error.message);

    }
  }
}

main();