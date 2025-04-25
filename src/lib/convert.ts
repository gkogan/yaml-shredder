import yaml from 'js-yaml';

type SupportedLang = 'go' | 'python' | 'typescript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractNodeVersion(steps: any[]): string | undefined {
  for (const step of steps) {
    if (step.uses && step.uses.startsWith('actions/setup-node')) {
      if (step.with && step.with['node-version']) {
        return String(step.with['node-version']);
      }
    }
  }
  return undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toGoPipeline(steps: any[]): string {
  const nodeVersion = extractNodeVersion(steps);
  const baseImage = nodeVersion ? `node:${nodeVersion}` : 'alpine';
  let code = `package main\n\nimport (\n  \"context\"\n  \"fmt\"\n  \"log\"\n  \"dagger.io/dagger\"\n)\n\nfunc main() {\n  ctx := context.Background()\n  client, err := dagger.Connect(ctx)\n  if err != nil {\n    log.Fatalf(\"failed to connect to Dagger: %v\", err)\n  }\n  defer client.Close()\n  container := client.Container().From(\"${baseImage}\").WithMountedDirectory(\"/app\", client.Host().Directory(\".\")).WithWorkdir(\"/app\")\n`;
  steps.forEach((step) => {
    if (step.run) {
      const cmd = step.run.replace(/"/g, '\\"');
      code += `  container = container.WithExec([]string{\"sh\", \"-c\", \"${cmd}\"})\n`;
    } else if (step.uses) {
      const action = String(step.uses).split('@')[0];
      if (!['actions/checkout', 'actions/setup-node'].includes(action)) {
        code += `  // TODO: ${step.name ? step.name + ': ' : ''}${step.uses}\n`;
      }
    }
  });
  code += `  out, err := container.Stdout(ctx)\n  if err != nil {\n    log.Fatalf(\"pipeline failed: %v\", err)\n  }\n  fmt.Println(out)\n}`;
  return code;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPythonPipeline(steps: any[]): string {
  const nodeVersion = extractNodeVersion(steps);
  const baseImage = nodeVersion ? `node:${nodeVersion}` : 'alpine';
  let code = `import dagger\nimport asyncio\n\nasync def main():\n    try:\n        async with dagger.Connection() as client:\n            container = (client.container().from_(\"${baseImage}\")\n                .with_mounted_directory(\"/app\", client.host().directory(\".\"))\n                .with_workdir(\"/app\")\n`;
  steps.forEach((step) => {
    if (step.run) {
      const cmd = step.run.replace(/"/g, '\\"');
      code += `                .with_exec([\"sh\", \"-c\", \"${cmd}\"])\n`;
    } else if (step.uses) {
      const action = String(step.uses).split('@')[0];
      if (!['actions/checkout', 'actions/setup-node'].includes(action)) {
        code += `    # TODO: ${step.name ? step.name + ': ' : ''}${step.uses}\n`;
      }
    }
  });
  code += `            )\n            out = await container.stdout()\n            print(out)\n    except Exception as e:\n        print(f\"Pipeline failed: {e}\")\n\nasyncio.run(main())\n`;
  return code;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toTypescriptPipeline(steps: any[]): string {
  const nodeVersion = extractNodeVersion(steps);
  const baseImage = nodeVersion ? `node:${nodeVersion}` : 'alpine';
  let code = `import { connect } from \"@dagger.io/dagger\";\n\n(async function main() {\n  try {\n    const client = await connect();\n    let container = client.container().from(\"${baseImage}\")\n      .withMountedDirectory(\"/app\", client.host().directory(\".\"))\n      .withWorkdir(\"/app\");\n`;
  steps.forEach((step) => {
    if (step.run) {
      const cmd = step.run.replace(/"/g, '\\"');
      code += `    container = container.withExec([\"sh\", \"-c\", \"${cmd}\"]);\n`;
    } else if (step.uses) {
      const action = String(step.uses).split('@')[0];
      if (!['actions/checkout', 'actions/setup-node'].includes(action)) {
        code += `    // TODO: ${step.name ? step.name + ': ' : ''}${step.uses}\n`;
      }
    }
  });
  code += `    const out = await container.stdout();\n    console.log(out);\n  } catch (err) {\n    console.error(\"Pipeline failed:\", err);\n  }\n})();\n`;
  return code;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function convertYamlToDagger({ yamlStr, language = 'go' as SupportedLang }: {
  yamlStr: string;
  language?: SupportedLang;
}): Promise<{ code: string; error?: string }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = yaml.load(yamlStr) as any;
    if (!doc || !doc.jobs) return { code: '', error: 'No jobs found in YAML.' };
    // Collect all steps from all jobs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let allSteps: any[] = [];
    for (const jobName of Object.keys(doc.jobs)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const job = doc.jobs[jobName];
      if (Array.isArray(job.steps)) {
        allSteps = allSteps.concat(job.steps);
      }
    }
    if (allSteps.length === 0) {
      return { code: '', error: 'No steps found in any job.' };
    }
    let code = '';
    if (language === 'go') code = toGoPipeline(allSteps);
    else if (language === 'python') code = toPythonPipeline(allSteps);
    else code = toTypescriptPipeline(allSteps);
    return { code };
  } catch (e) {
    return { code: '', error: 'Parse error: ' + (e as Error).message };
  }
}
