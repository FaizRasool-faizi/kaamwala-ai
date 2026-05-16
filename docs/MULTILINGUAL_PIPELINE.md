# Multilingual Pipeline

## Purpose & Scope
Handles English, Urdu, and Roman Urdu processing seamlessly.

## Processing Steps
1. **Language Detection**: Fast heuristic or LLM-based detection.
2. **Normalization**:
   - *Roman Urdu*: Maps slang ("bhai", "jaldi") to standard intent markers (relationship, urgency).
   - *Misspellings*: Fuzzy matching against known vocabulary.
3. **Intent Extraction**: Core mapping to service types.

## Fallback & Confirmation
- If intent confidence < 80%: "Aapko plumber chahiye pipe theek karne ke liye? (Yes/No)"
- **Code-switching**: Handles mixed sentences natively via Gemini 3.1 Pro context.
