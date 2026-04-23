function getAppBinding(methodName) {
  if (typeof window === 'undefined') {
    return null;
  }

  return window?.go?.main?.App?.[methodName] ?? null;
}

export async function selectOutputFolder() {
  const method = getAppBinding('SelectOutputFolder');
  if (!method) {
    throw new Error('Native folder picker is unavailable in this environment.');
  }

  const selectedFolder = await method();
  return String(selectedFolder || '').trim();
}

export async function writeGeneratedFile(outputFolder, relativePath, content) {
  const method = getAppBinding('WriteGeneratedFile');
  if (!method) {
    throw new Error('Native file writing is unavailable in this environment.');
  }

  const writtenPath = await method(outputFolder, relativePath, content);
  return String(writtenPath || '').trim();
}

export async function readGeneratedFile(outputFolder, relativePath) {
  const method = getAppBinding('ReadGeneratedFile');
  if (!method) {
    throw new Error('Native file reading is unavailable in this environment.');
  }

  const fileContent = await method(outputFolder, relativePath);
  return String(fileContent || '');
}

export async function listGeneratedFiles(outputFolder, relativePath = '') {
  const method = getAppBinding('ListGeneratedFiles');
  if (!method) {
    throw new Error('Native file listing is unavailable in this environment.');
  }

  const payload = await method(outputFolder, relativePath);
  const rawValue = String(payload || '[]');

  try {
    return JSON.parse(rawValue);
  } catch {
    return [];
  }
}

export async function saveSession(sessionState) {
  const method = getAppBinding('SaveSession');
  if (!method) {
    throw new Error('Session persistence is unavailable in this environment.');
  }

  const payload = typeof sessionState === 'string' ? sessionState : JSON.stringify(sessionState ?? {});
  await method(payload);
}

export async function loadSession() {
  const method = getAppBinding('LoadSession');
  if (!method) {
    throw new Error('Session persistence is unavailable in this environment.');
  }

  const payload = await method();
  const rawValue = String(payload || '');

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
}
