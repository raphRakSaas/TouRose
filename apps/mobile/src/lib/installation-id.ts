import AsyncStorage from '@react-native-async-storage/async-storage';

const INSTALLATION_ID_KEY = 'tourose.installation_id';

function createInstallationId(): string {
  const randomPart = Math.random().toString(36).slice(2, 10);
  const timePart = Date.now().toString(36);
  return `inst_${timePart}_${randomPart}`;
}

export async function getOrCreateInstallationId(): Promise<string> {
  const existingId = await AsyncStorage.getItem(INSTALLATION_ID_KEY);
  if (existingId) {
    return existingId;
  }

  const installationId = createInstallationId();
  await AsyncStorage.setItem(INSTALLATION_ID_KEY, installationId);
  return installationId;
}
