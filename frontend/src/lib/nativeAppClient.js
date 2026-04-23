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
