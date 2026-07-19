export async function callLLM(prompt, options = {}) {
  // Groq API endpoint configuration
  const apiKey = document.body.getAttribute('data-api-key') || localStorage.getItem('GROQ_API_KEY');
  if (!apiKey) {
    console.warn("No Groq API key found. Provide via data-api-key or localStorage 'GROQ_API_KEY'.");
    return { error: "Missing API Key" };
  }

  const endpoint = "https://api.groq.com/openai/v1/chat/completions";
  const model = options.model || "llama3-70b-8192";

  let retries = 3;
  let delay = 2000;

  while (retries > 0) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: options.systemPrompt || "You are a helpful assistant." },
            { role: "user", content: prompt }
          ],
          temperature: options.temperature || 0,
          max_tokens: options.max_tokens || 1024
        })
      });

      if (response.status === 429) {
        console.warn(`Rate limited (429). Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
        retries--;
        continue;
      }

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Token budget tracking
      if (data.usage && data.usage.total_tokens) {
        console.log(`Token usage for this call: ${data.usage.total_tokens}`);
        window.totalTokensUsed = (window.totalTokensUsed || 0) + data.usage.total_tokens;
        if (window.totalTokensUsed > 50000) {
          console.warn(`Token budget warning: Exceeded 50,000 tokens (${window.totalTokensUsed})`);
        }
      }

      return data.choices[0].message.content;
    } catch (error) {
      if (retries === 1) throw error;
      retries--;
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}
