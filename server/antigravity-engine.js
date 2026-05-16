const Groq = require('groq-sdk');
require('dotenv').config();

class AntigravityEngine {
    constructor(config) {
        // Support both GEMINI (legacy) and GROQ (new) for configuration
        this.apiKey = config.apiKey || process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY;
        this.modelName = config.model || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

        if (!this.apiKey) {
            throw new Error('Missing GROQ_API_KEY in configuration or .env');
        }

        this.groq = new Groq({
            apiKey: this.apiKey
        });

        this.logs = [];
        this.socket = null;
    }

    setSocket(socket) {
        this.socket = socket;
    }

    log(message) {
        this.logs.push({
            type: 'system',
            timestamp: new Date().toISOString(),
            message
        });
        console.log(`[Antigravity Log] ${message}`);
        this.emitTrace('ORCHESTRATOR', 'System Log', message, 100, 0, 'info', 'success');
    }

    emitTrace(agent, action, reasoningSummary, confidenceScore, latencyMs, severity = 'info', status = 'success', metadata = null) {
        const trace = {
            id: Math.random().toString(36).substring(7),
            timestamp: new Date().toISOString(),
            agent,
            action,
            reasoningSummary,
            confidenceScore,
            latencyMs,
            severity,
            status,
            metadata
        };

        if (this.socket) {
            this.socket.emit('trace', trace);
        }
        this.logs.push(trace);
    }

    async runAgent(agentName, prompt, userInput, metadata = null) {
        console.log(`\n[Antigravity Log] Starting Groq-Agent: ${agentName}...`);
        const startTime = Date.now();

        // Emit pending state
        this.emitTrace(agentName, 'Thinking...', `Agent ${agentName} is analyzing context...`, 0, 0, 'info', 'pending');

        try {
            const chatCompletion = await this.groq.chat.completions.create({
                messages: [
                    {
                        role: 'system',
                        content: `${prompt}\n\nCRITICAL: Your output must be a valid JSON object. Do not include any markdown formatting like \`\`\`json or any text outside the JSON structure.`
                    },
                    {
                        role: 'user',
                        content: `User Input: ${userInput}\nAdditional Context: ${metadata ? JSON.stringify(metadata) : 'None'}`
                    }
                ],
                model: this.modelName,
                response_format: { "type": "json_object" }
            });

            const text = chatCompletion.choices[0]?.message?.content || '{}';
            const latencyMs = Date.now() - startTime;

            // Parse the JSON output
            const parsedOutput = JSON.parse(text.trim());

            // Emit success state
            this.emitTrace(
                agentName, 
                parsedOutput.action || 'Analysis Complete', 
                parsedOutput.reasoning || parsedOutput.message || 'Task completed successfully.',
                parsedOutput.confidence || 95,
                latencyMs,
                'info',
                'success',
                parsedOutput
            );

            return parsedOutput;

        } catch (error) {
            const latencyMs = Date.now() - startTime;
            console.error(`[Antigravity Log] Groq Error:`, error);

            this.emitTrace(
                agentName,
                'Error',
                `Failed: ${error.message}`,
                0,
                latencyMs,
                'critical',
                'error'
            );

            return {
                error: 'Groq generation or parsing failed.',
                message: error.message
            };
        }
    }

    getExecutionLogs() {
        return this.logs;
    }
}

module.exports = AntigravityEngine;