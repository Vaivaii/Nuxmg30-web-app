export const TONE3000_WORKSPACE_KEY = 'mg30-t3k-workspace-v1';

function text(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export function normalizeToneCatalogue(toneId, tone, models) {
  const id = String(toneId ?? '').trim();
  if (!/^\\d+$/.test(id)) throw new TypeError('Invalid TONE3000 tone ID');
  if (!Array.isArray(models)) throw new TypeError('TONE3000 models must be an array');

  const normalizedModels = models
    .filter(model => model && typeof model === 'object')
    .map((model, index) => {
      const modelUrl = text(model.model_url || model.modelUrl);
      const modelName = text(model.name || model.title, `tone-${id}-model-${index + 1}.nam`);
      const modelId = text(
        model.id ?? model.model_id ?? model.uuid ?? model.slug,
        modelUrl || `${id}:${index}:${modelName}`
      );
      return {
        id: modelId,
        name: modelName,
        model_url: modelUrl,
        architecture_version: model.architecture_version ?? null,
        architecture: model.architecture ?? null,
        size: typeof model.size === 'number' || typeof model.size === 'string'
          ? model.size
          : model.size?.label || model.size?.name || null,
        description: text(model.description),
      };
    })
    .filter(model => model.model_url);

  const creator = text(
    tone?.username || tone?.creator?.username || tone?.user?.username || tone?.user?.name
  );
  return {
    version: 1,
    toneId: id,
    tone: {
      name: text(tone?.name || tone?.title, `TONE3000 tone #${id}`),
      creator,
      description: text(tone?.description),
    },
    models: normalizedModels,
    selectedModelId: normalizedModels[0]?.id || '',
    updatedAt: Date.now(),
  };
}

export function parseToneCatalogue(raw) {
  if (!raw) return null;
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!data || data.version !== 1 || !/^\\d+$/.test(String(data.toneId || '')) ||
        !Array.isArray(data.models) || !data.tone || typeof data.tone !== 'object') return null;
    const models = data.models.filter(model =>
      model && typeof model === 'object' &&
      typeof model.id === 'string' &&
      typeof model.name === 'string' &&
      typeof model.model_url === 'string' && model.model_url
    );
    return {
      version: 1,
      toneId: String(data.toneId),
      tone: {
        name: text(data.tone.name, `TONE3000 tone #${data.toneId}`),
        creator: text(data.tone.creator),
        description: text(data.tone.description),
      },
      models,
      selectedModelId: models.some(model => model.id === data.selectedModelId)
        ? data.selectedModelId
        : models[0]?.id || '',
      updatedAt: Number.isFinite(Number(data.updatedAt)) ? Number(data.updatedAt) : 0,
    };
  } catch {
    return null;
  }
}

export function readToneCatalogue(storage) {
  try {
    return parseToneCatalogue(storage?.getItem(TONE3000_WORKSPACE_KEY));
  } catch {
    return null;
  }
}

export function writeToneCatalogue(storage, catalogue) {
  const normalized = parseToneCatalogue(catalogue);
  if (!normalized) return false;
  try {
    storage?.setItem(TONE3000_WORKSPACE_KEY, JSON.stringify(normalized));
    return true;
  } catch {
    return false;
  }
}

export function selectToneModel(catalogue, modelId) {
  const normalized = parseToneCatalogue(catalogue);
  if (!normalized || !normalized.models.some(model => model.id === String(modelId))) return null;
  return { ...normalized, selectedModelId: String(modelId) };
}
