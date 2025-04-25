import { OpenAI } from 'openai';

const SYSTEM_PROMPT = `You are a CI-to-Dagger translator. Input is YAML for GitHub Actions.\nOutput Go code using Dagger SDK that does the same high-level work (checkout, build, test, push image, etc.). Keep it ≤40 lines.`;

export async function convertWithOpenAI({ yamlStr, language, apiKey }: {
  yamlStr: string;
  language: 'go' | 'python' | 'typescript';
  apiKey: string;
}): Promise<string> {
  const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  const userPrompt = `Convert this GitHub Actions YAML to Dagger (${language}):\n\n${yamlStr}`;
  const resp = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 1200,
    temperature: 0.3,
  });
  return resp.choices[0]?.message?.content || '';
}
