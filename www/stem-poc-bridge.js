import { registerPlugin } from '@capacitor/core';

export const MG30StemPoc = registerPlugin('MG30StemPoc');

export async function downloadScnetModel() {
  return MG30StemPoc.downloadModel();
}

export async function inspectScnetModel() {
  return MG30StemPoc.inspectModel();
}
