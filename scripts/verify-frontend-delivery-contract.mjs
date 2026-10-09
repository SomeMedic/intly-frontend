#!/usr/bin/env node
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const deployScript = join(repoRoot, 'ops/deploy-frontend.sh');
const validSha = 'ghcr.io/example/intly-frontend:sha-0123456789abcdef0123456789abcdef01234567';
const validDigest = `ghcr.io/example/intly-frontend@sha256:${'a'.repeat(64)}`;
const checks = [];

await check('deployment rejects latest tag without invoking docker', () => {
  const run = runDeploy({ imageRef: 'ghcr.io/example/intly-frontend:latest', curlMode: 'success' });
  assert(run.status === 2, `expected exit 2, got ${run.status}`);
  assert(!run.dockerLog, `docker was invoked: ${run.dockerLog}`);
});

await check('deployment rejects malformed sha-like mutable tags without invoking docker', () => {
  const rejectedRefs = [
    'ghcr.io/example/intly-frontend:sha-latest',
    'ghcr.io/example/intly-frontend:sha-shadow',
    'ghcr.io/example/intly-frontend:sha-1234',
    'ghcr.io/example/intly-frontend:shadow',
    `ghcr.io/example/intly-frontend@sha256:${'a'.repeat(63)}`,
  ];

  for (const imageRef of rejectedRefs) {
    const run = runDeploy({ imageRef, curlMode: 'success' });
    assert(run.status === 2, `${imageRef} expected exit 2, got ${run.status}`);
    assert(!run.dockerLog, `${imageRef} invoked docker: ${run.dockerLog}`);
  }
});

await check('deployment accepts exact sha tag and runs compose config, pull, up with default env file', () => {
  const run = runDeploy({ imageRef: validSha, curlMode: 'success' });
  assert(run.status === 0, `expected success, got ${run.status}\n${run.stderr}`);
  assertDockerSequence(run.dockerLog, dockerSequence('env.production'));
});

await check('deployment accepts sha256 digest and runs compose config, pull, up', () => {
  const run = runDeploy({ imageRef: validDigest, curlMode: 'success' });
  assert(run.status === 0, `expected success, got ${run.status}\n${run.stderr}`);
  assertDockerSequence(run.dockerLog, dockerSequence('env.production'));
});

await check('deployment accepts external absolute env file path', () => {
  const run = runDeploy({ imageRef: validSha, curlMode: 'success', envFileMode: 'external-absolute' });
  assert(run.status === 0, `expected success, got ${run.status}\n${run.stderr}`);
  assert(run.envFile.endsWith('/runtime/frontend.env'), `expected external env file path, got ${run.envFile}`);
  assertDockerSequence(run.dockerLog, dockerSequence(run.envFile));
});

await check('deployment rejects missing env file before invoking docker', () => {
  const run = runDeploy({ imageRef: validSha, curlMode: 'success', envFileMode: 'missing' });
  assert(run.status === 2, `expected exit 2, got ${run.status}`);
  assert(run.stderr.includes('INTLY_FRONTEND_ENV_FILE not found'), `missing env file message: ${run.stderr}`);
  assert(!run.dockerLog, `docker was invoked: ${run.dockerLog}`);
});

await check('deployment rejects invalid health timeouts before invoking docker', () => {
  const invalidValues = ['0', '-1', 'abc'];

  for (const healthTimeoutSeconds of invalidValues) {
    const run = runDeploy({ imageRef: validSha, curlMode: 'success', healthTimeoutSeconds });
    assert(run.status === 2, `${healthTimeoutSeconds} expected exit 2, got ${run.status}`);
    assert(run.stderr.includes('HEALTH_TIMEOUT_SECONDS must be a positive integer'), `missing timeout validation message: ${run.stderr}`);
    assert(!run.dockerLog, `${healthTimeoutSeconds} invoked docker: ${run.dockerLog}`);
  }
});

await check('deployment reports failed health as a nonzero exit after compose up', () => {
  const run = runDeploy({ imageRef: validSha, curlMode: 'fail', healthTimeoutSeconds: '1' });
  assert(run.status === 1, `expected health failure exit 1, got ${run.status}`);
  assert(run.stderr.includes('Frontend health check failed'), `missing health failure message: ${run.stderr}`);
  assert(run.dockerLog.includes('compose --env-file env.production -f compose.yaml ps frontend'), `missing diagnostic compose ps: ${run.dockerLog}`);
});

await check('container health checks require HTTP ok responses', () => {
  const dockerfile = readFileSync(join(repoRoot, 'Dockerfile'), 'utf8');
  const compose = readFileSync(join(repoRoot, 'compose.yaml'), 'utf8');
  assert(dockerfile.includes('if(!r.ok)process.exit(1)'), 'Dockerfile health check does not enforce r.ok');
  assert(compose.includes('if(!r.ok)process.exit(1)'), 'compose health check does not enforce r.ok');
});

await check('CI keeps tests mandatory and builds an immutable SHA image', () => {
  const workflow = readFileSync(join(repoRoot, '.github/workflows/frontend-ci.yml'), 'utf8');
  assert(workflow.includes('pnpm exec vitest run'), 'Vitest run missing');
  assert(!workflow.includes('--passWithNoTests'), 'Vitest must not pass when tests are missing');
  assert(workflow.includes('image_ref=ghcr.io/${GITHUB_REPOSITORY,,}:sha-${GITHUB_SHA}'), 'CI image ref is not lowercased and SHA-tagged');
  assert(workflow.includes('steps.image-meta.outputs.image_ref'), 'CI image ref output is not wired into image/deploy steps');
  assert(workflow.includes("github.ref == 'refs/heads/main'"), 'deploy job is not restricted to main');
  assert(workflow.includes("github.event_name == 'push'"), 'deploy job does not run after main push');
  assert(workflow.includes("github.event_name == 'workflow_dispatch' && inputs.deploy == true"), 'deploy job does not retain manual dispatch path');
  assert(workflow.includes('docker compose --env-file "$INTLY_FRONTEND_ENV_FILE" -f compose.yaml config --quiet'), 'CI does not validate compose config with explicit env file');
  assert(workflow.includes('INTLY_FRONTEND_ENV_FILE: .env.production.example'), 'CI compose validation does not use non-secret env example');
  assert(workflow.includes('runs-on: ubuntu-latest'), 'workflow must deploy from a GitHub-hosted runner');
  assert(!workflow.includes('self-hosted'), 'workflow must not require a persistent self-hosted runner');
  assert(workflow.includes('environment: production'), 'deploy job is not environment-protected');
  assert(workflow.includes('packages: write'), 'publish job must be allowed to write GHCR packages');
  assert(workflow.includes('packages: read'), 'deploy job must be allowed to pass a read-scoped GHCR token');
  assert(workflow.includes('cancel-in-progress: false'), 'production deploy concurrency must not cancel an in-flight deploy');
  assert(workflow.includes('DEPLOY_KNOWN_HOSTS'), 'deploy job does not pin SSH known hosts');
  assert(workflow.includes('StrictHostKeyChecking=yes'), 'deploy job does not enforce strict SSH host checking');
  assert(workflow.includes('IdentitiesOnly=yes'), 'deploy job does not restrict SSH identities');
  assert(workflow.includes('git archive --format=tar --output="$tarball" HEAD'), 'deploy job must send only tracked source');
  assert(workflow.includes('printf \'%s\\n\' "$GHCR_TOKEN"'), 'deploy job must stream GHCR token on stdin');
  assert(workflow.includes('"deploy ${GITHUB_SHA}"'), 'deploy job must call the restricted forced command protocol');
  assert(!workflow.includes('docker/login-action@v3') || workflow.indexOf('Login to GHCR') < workflow.indexOf('Build and publish immutable Docker image'), 'GHCR login should be limited to the publish job');
});

const failed = checks.filter((item) => !item.ok);
console.log(JSON.stringify({ ok: failed.length === 0, checks }, null, 2));
if (failed.length) process.exit(1);

async function check(name, fn) {
  try {
    await fn();
    checks.push({ name, ok: true });
  } catch (error) {
    checks.push({ name, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}

function runDeploy({ imageRef, curlMode, healthTimeoutSeconds = '2', envFileMode = 'default' }) {
  const dir = mkdtempSync(join(tmpdir(), 'intly-frontend-deploy-contract-'));
  const fakebin = join(dir, 'bin');
  const dockerLogPath = join(dir, 'docker.log');
  mkdirSync(fakebin);
  cpSync(join(repoRoot, 'compose.yaml'), join(dir, 'compose.yaml'));
  const defaultEnvFile = join(dir, 'env.production');
  const externalEnvFile = join(dir, 'runtime', 'frontend.env');
  mkdirSync(dirname(externalEnvFile), { recursive: true });
  writeFileSync(defaultEnvFile, 'NEXT_PUBLIC_API_URL=https://api.intly.tech/api/v1\nNEXT_PUBLIC_ENABLE_MSW=false\n');
  writeFileSync(externalEnvFile, 'NEXT_PUBLIC_API_URL=https://api.intly.tech/api/v1\nNEXT_PUBLIC_ENABLE_MSW=false\n');
  const envFile = envFileMode === 'external-absolute' ? externalEnvFile : envFileMode === 'missing' ? join(dir, 'missing.env') : 'env.production';
  writeExecutable(join(fakebin, 'docker'), `#!/usr/bin/env bash\necho \"$*\" >> ${shellQuote(dockerLogPath)}\nexit 0\n`);
  writeExecutable(join(fakebin, 'curl'), `#!/usr/bin/env bash\nif [[ ${shellQuote(curlMode)} == success ]]; then exit 0; fi\nexit 22\n`);
  writeExecutable(join(fakebin, 'sleep'), '#!/usr/bin/env bash\nexit 0\n');

  try {
    const result = spawnSync('bash', [deployScript], {
      cwd: dir,
      env: {
        PATH: `${fakebin}:${process.env.PATH ?? ''}`,
        IMAGE_REF: imageRef,
        COMPOSE_FILE: 'compose.yaml',
        SERVICE_NAME: 'frontend',
        HEALTH_URL: 'http://127.0.0.1:3000/',
        HEALTH_TIMEOUT_SECONDS: healthTimeoutSeconds,
        INTLY_FRONTEND_ENV_FILE: envFile,
      },
      encoding: 'utf8',
      timeout: 10_000,
    });

    return {
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
      error: result.error,
      dockerLog: existsSync(dockerLogPath) ? readFileSync(dockerLogPath, 'utf8') : '',
      envFile,
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function dockerSequence(envFile) {
  return [
    `compose --env-file ${envFile} -f compose.yaml config --quiet`,
    `compose --env-file ${envFile} -f compose.yaml pull frontend`,
    `compose --env-file ${envFile} -f compose.yaml up -d --no-build frontend`,
  ];
}

function writeExecutable(path, content) {
  writeFileSync(path, content);
  chmodSync(path, 0o755);
}

function assertDockerSequence(actual, expected) {
  const lines = actual.trim().split('\n').filter(Boolean);
  assert(lines.length === expected.length, `expected ${expected.length} docker invocations, got ${lines.length}: ${actual}`);
  for (let i = 0; i < expected.length; i += 1) {
    assert(lines[i] === expected[i], `docker call ${i + 1} expected ${expected[i]}, got ${lines[i]}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}
