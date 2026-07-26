# ADR-002: LLM as Structured Query Translator (Not RAG)

**Status:** Accepted  
**Date:** 2026-07  

## Context

Officers need to query the FIR database using natural language (e.g., "show me burglary cases in Bengaluru last week"). Options: RAG over FIR documents, or LLM-based NL-to-ES translation.

## Decision

Use the LLM to translate natural language directly into a structured Elasticsearch JSON query, then execute that query against the crime index. No RAG pipeline.

```
User: "burglary cases in Bengaluru last week"
  → LLM: { "query": { "bool": { "must": [ ... ] } } }
  → Elasticsearch: executes structured query
  → Response: matching FIRs
```

## Consequences

- **Positive:** No embedding/indexing pipeline needed. Fresh data is immediately queryable.
- **Positive:** Structured query allows precise filtering, sorting, and pagination.
- **Negative:** LLM must produce valid ES query syntax — requires prompt engineering and validation.
- **Negative:** LLM cost per query is higher than RAG lookup.
