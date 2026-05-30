import * as dotenv from "dotenv";
dotenv.config();

import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

import { Pinecone } from "@pinecone-database/pinecone";

import { pipeline } from "@xenova/transformers";

async function indexDocument() {
  // Load PDF
  const pdfLoader = new PDFLoader("./dsa.pdf");

  const rawDocs = await pdfLoader.load();

  console.log("Documents loaded successfully");

  // Chunking
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const chunkedDocs = await textSplitter.splitDocuments(rawDocs);

  console.log("Chunked documents created:", chunkedDocs.length);

  // Load Local Embedding Model
  const extractor = await pipeline(
  "feature-extraction",
  "Xenova/bge-base-en-v1.5"
);

  console.log("Embedding model loaded");

  // Pinecone Configure
  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });

  const pineconeIndex = pinecone.Index(
    process.env.PINECONE_INDEX_NAME
  );

  console.log("Pinecone initialized");

  // Convert and Store Embeddings
  for (let i = 0; i < chunkedDocs.length; i++) {
    const doc = chunkedDocs[i];

    // Generate embedding
    const output = await extractor(doc.pageContent, {
      pooling: "mean",
      normalize: true,
    });

    const embedding = Array.from(output.data);

    // Store in Pinecone
    await pineconeIndex.upsert([
      {
        id: `doc-${i}`,
        values: embedding,
        metadata: {
          text: doc.pageContent,
        },
      },
    ]);

    console.log(`Indexed chunk ${i + 1}/${chunkedDocs.length}`);
  }

  console.log("Documents indexed successfully");
}

indexDocument();